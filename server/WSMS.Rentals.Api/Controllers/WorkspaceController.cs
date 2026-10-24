using System.Globalization;
using System.Security.Claims;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using WSMS.Rentals.Api.Data;

namespace WSMS.Rentals.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class WorkspaceController : ControllerBase
{
    private readonly IDbConnectionFactory connectionFactory;

    public WorkspaceController(IDbConnectionFactory connectionFactory)
    {
        this.connectionFactory = connectionFactory;
    }

    private Guid CurrentUserId
    {
        get
        {
            string? userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            if (Guid.TryParse(userId, out Guid parsedUserId))
            {
                return parsedUserId;
            }

            throw new UnauthorizedAccessException("The authenticated user id is missing or invalid.");
        }
    }

    [Authorize]
    [HttpGet("auth/me")]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var user = await GetProfileAsync(cancellationToken);
        return user is null ? NotFound() : Ok(new { user });
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var user = await GetProfileAsync(cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile(ProfileRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Username)
            || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Name, username, and email are required." });
        if (request.Name.Trim().Length > 160 || request.Username.Trim().Length > 80 || request.Email.Trim().Length > 254)
            return BadRequest(new { message = "One or more profile fields exceed their allowed length." });

        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                """
                UPDATE app_users
                SET full_name = @Name, username = @Username, email = LOWER(@Email),
                    phone = @Phone, address = @Address
                WHERE id = @UserId AND is_active = TRUE;
                """,
                new
                {
                    Name = request.Name.Trim(),
                    Username = request.Username.Trim(),
                    Email = request.Email.Trim(),
                    Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                    Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                    UserId = CurrentUserId
                },
                cancellationToken: cancellationToken));
        if (affected == 0) return NotFound(new { message = "User not found." });
        var user = await GetProfileAsync(cancellationToken);
        return Ok(user);
    }

    [Authorize]
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var settings = await connection.QuerySingleAsync(
            new CommandDefinition(
                """
                INSERT INTO user_settings (user_id) VALUES (@UserId)
                ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
                RETURNING low_stock_threshold AS "lowStockThreshold", density,
                          show_notifications AS "showNotifications";
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(settings);
    }

    [Authorize]
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(SettingsRequest request, CancellationToken cancellationToken)
    {
        string density = request.Density?.ToUpperInvariant() ?? "";
        if (request.LowStockThreshold < 0 || density is not ("COMFORTABLE" or "COMPACT"))
            return BadRequest(new { message = "Choose a valid low-stock threshold and dashboard density." });

        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var settings = await connection.QuerySingleAsync(
            new CommandDefinition(
                """
                INSERT INTO user_settings (user_id, low_stock_threshold, density, show_notifications)
                VALUES (@UserId, @Threshold, @Density, @ShowNotifications)
                ON CONFLICT (user_id) DO UPDATE
                SET low_stock_threshold = EXCLUDED.low_stock_threshold,
                    density = EXCLUDED.density,
                    show_notifications = EXCLUDED.show_notifications
                RETURNING low_stock_threshold AS "lowStockThreshold", density,
                          show_notifications AS "showNotifications";
                """,
                new
                {
                    UserId = CurrentUserId,
                    Threshold = request.LowStockThreshold,
                    Density = density,
                    request.ShowNotifications
                },
                cancellationToken: cancellationToken));
        return Ok(settings);
    }

    [Authorize]
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var orders = await connection.QueryAsync<OrderRow>(
            new CommandDefinition(
                """
                SELECT orders.id, orders.order_number AS "orderNumber",
                       CASE orders.status WHEN 'PENDING' THEN 'DRAFT'
                            WHEN 'CONFIRMED' THEN 'PROCESSING' ELSE orders.status END AS status,
                       orders.created_at AS "createdAt", orders.updated_at AS "updatedAt",
                       line.quantity AS "Quantity", item.id AS "ItemId",
                       item.sku AS "Sku", item.name AS "ItemName",
                       item.warehouse_id AS "WarehouseId"
                FROM customer_orders AS orders
                LEFT JOIN order_items AS line ON line.order_id = orders.id
                LEFT JOIN inventory_items AS item ON item.id = line.inventory_item_id
                WHERE orders.customer_user_id = @UserId
                ORDER BY orders.created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(orders.Select(ToOrderResponse));
    }

    [Authorize]
    [HttpPost("orders")]
    public Task<IActionResult> CreateOrder(OrderRequest request, CancellationToken cancellationToken)
    {
        return SaveOrderAsync(null, request, cancellationToken);
    }

    [Authorize]
    [HttpPatch("orders/{id:guid}")]
    public Task<IActionResult> UpdateOrder(Guid id, OrderRequest request, CancellationToken cancellationToken)
    {
        return SaveOrderAsync(id, request, cancellationToken);
    }

    [Authorize]
    [HttpDelete("orders/{id:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                "DELETE FROM customer_orders WHERE id = @Id AND customer_user_id = @UserId;",
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Order not found." }) : NoContent();
    }

    [AllowAnonymous]
    [HttpGet("listings")]
    public async Task<IActionResult> GetListings(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var listings = await connection.QueryAsync<ListingRow>(
            new CommandDefinition(
                """
                SELECT property.id, property.owner_user_id AS "ownerId",
                       property.property_name AS name, property.property_type AS type,
                       property.city, property.area_sqft AS "areaSqft",
                       property.monthly_rent AS price, property.currency,
                       (SELECT image_url FROM property_images
                        WHERE property_id = property.id ORDER BY display_order LIMIT 1) AS "imageUrl",
                       property.created_at AS "createdAt", property.updated_at AS "updatedAt"
                FROM rental_properties AS property
                WHERE property.is_active = TRUE
                ORDER BY property.created_at DESC;
                """,
                cancellationToken: cancellationToken));
        return Ok(listings.Select(ToListingResponse));
    }

    [Authorize]
    [HttpPost("listings")]
    public Task<IActionResult> CreateListing(ListingRequest request, CancellationToken cancellationToken)
    {
        return SaveListingAsync(null, request, cancellationToken);
    }

    [Authorize]
    [HttpPut("listings/{id:guid}")]
    public Task<IActionResult> UpdateListing(Guid id, ListingRequest request, CancellationToken cancellationToken)
    {
        return SaveListingAsync(id, request, cancellationToken);
    }

    [Authorize]
    [HttpDelete("listings/{id:guid}")]
    public async Task<IActionResult> DeleteListing(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int bookingCount = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                """
                SELECT COUNT(*)
                FROM rental_bookings AS booking
                JOIN rental_properties AS property ON property.id = booking.property_id
                WHERE booking.property_id = @Id AND property.owner_user_id = @UserId;
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (bookingCount > 0)
            return Conflict(new { message = "Cancel or remove bookings before deleting this listing." });

        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                "DELETE FROM rental_properties WHERE id = @Id AND owner_user_id = @UserId;",
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Rental listing not found." }) : NoContent();
    }

    [Authorize]
    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var bookings = await connection.QueryAsync(
            new CommandDefinition(
                """
                SELECT booking.id, booking.property_id AS "listingId",
                       COALESCE(NULLIF(booking.notes, ''), customer.full_name) AS customer,
                       booking.start_date AS "startDate",
                       CASE booking.status WHEN 'PENDING' THEN 'REQUESTED'
                            WHEN 'APPROVED' THEN 'CONFIRMED' ELSE booking.status END AS status,
                       booking.created_at AS "createdAt", booking.updated_at AS "updatedAt",
                       property.property_name AS "listingName"
                FROM rental_bookings AS booking
                JOIN rental_properties AS property ON property.id = booking.property_id
                JOIN app_users AS customer ON customer.id = booking.customer_user_id
                WHERE booking.customer_user_id = @UserId OR property.owner_user_id = @UserId
                ORDER BY booking.created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(bookings);
    }

    [Authorize]
    [HttpPost("bookings")]
    public async Task<IActionResult> CreateBooking(BookingRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Customer))
            return BadRequest(new { message = "A booking contact name is required." });
        string? status = BookingStatus(request.Status);
        if (status is null) return BadRequest(new { message = "Choose a valid booking status." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var booking = await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                INSERT INTO rental_bookings (
                    property_id, customer_user_id, start_date, end_date, status,
                    monthly_rent_snapshot, security_deposit_snapshot, notes
                )
                SELECT property.id, @UserId, @StartDate, @StartDate + 30, @Status,
                       property.monthly_rent, property.security_deposit, @Customer
                FROM rental_properties AS property
                WHERE property.id = @ListingId AND property.is_active = TRUE
                  AND property.owner_user_id <> @UserId
                RETURNING id, property_id AS "listingId", notes AS customer,
                          start_date AS "startDate", status,
                          created_at AS "createdAt", updated_at AS "updatedAt";
                """,
                new
                {
                    UserId = CurrentUserId,
                    request.StartDate,
                    Status = status,
                    Customer = request.Customer.Trim(),
                    request.ListingId
                },
                cancellationToken: cancellationToken));
        return booking is null
            ? NotFound(new { message = "Rental listing not found or cannot be booked by its owner." })
            : Ok(booking);
    }

    [Authorize]
    [HttpPatch("bookings/{id:guid}")]
    public async Task<IActionResult> UpdateBooking(Guid id, BookingUpdateRequest request, CancellationToken cancellationToken)
    {
        if (request.ListingId == Guid.Empty || string.IsNullOrWhiteSpace(request.Customer))
            return BadRequest(new { message = "Choose a rental listing and enter a booking contact name." });
        string? status = BookingStatus(request.Status);
        if (status is null) return BadRequest(new { message = "Choose a valid booking status." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var booking = await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                UPDATE rental_bookings AS booking
                SET property_id = property.id, start_date = @StartDate,
                    end_date = @StartDate + 30, notes = @Customer, status = @Status
                FROM rental_properties AS property
                WHERE booking.id = @Id
                  AND property.id = @ListingId AND property.is_active = TRUE
                  AND (property.id = booking.property_id OR property.owner_user_id <> @UserId)
                  AND (booking.customer_user_id = @UserId OR EXISTS (
                      SELECT 1 FROM rental_properties AS original_property
                      WHERE original_property.id = booking.property_id
                        AND original_property.owner_user_id = @UserId
                  ))
                RETURNING booking.id, booking.property_id AS "listingId",
                          booking.notes AS customer,
                          booking.start_date AS "startDate", booking.status,
                          booking.created_at AS "createdAt", booking.updated_at AS "updatedAt";
                """,
                new
                {
                    Id = id,
                    UserId = CurrentUserId,
                    request.ListingId,
                    request.StartDate,
                    Customer = request.Customer.Trim(),
                    Status = status
                },
                cancellationToken: cancellationToken));
        return booking is null ? NotFound(new { message = "Booking not found." }) : Ok(booking);
    }

    [Authorize]
    [HttpDelete("bookings/{id:guid}")]
    public async Task<IActionResult> DeleteBooking(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                """
                DELETE FROM rental_bookings AS booking
                WHERE booking.id = @Id
                  AND (booking.customer_user_id = @UserId OR EXISTS (
                      SELECT 1 FROM rental_properties AS property
                      WHERE property.id = booking.property_id AND property.owner_user_id = @UserId
                  ));
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Booking not found." }) : NoContent();
    }

    [Authorize]
    [HttpGet("favorites")]
    public async Task<IActionResult> GetFavorites(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var favorites = await connection.QueryAsync(
            new CommandDefinition(
                """
                SELECT property.id AS "listingId", favorite.created_at AS "createdAt"
                FROM favorite_properties AS favorite
                JOIN rental_properties AS property ON property.id = favorite.property_id
                WHERE favorite.user_id = @UserId
                ORDER BY favorite.created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(favorites);
    }

    [Authorize]
    [HttpPut("favorites/{listingId:guid}")]
    public async Task<IActionResult> AddFavorite(Guid listingId, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var favorite = await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                INSERT INTO favorite_properties (user_id, property_id)
                SELECT @UserId, id FROM rental_properties WHERE id = @ListingId AND is_active = TRUE
                ON CONFLICT (user_id, property_id) DO UPDATE SET user_id = EXCLUDED.user_id
                RETURNING user_id AS "userId", property_id AS "listingId", created_at AS "createdAt";
                """,
                new { UserId = CurrentUserId, ListingId = listingId },
                cancellationToken: cancellationToken));
        return favorite is null ? NotFound(new { message = "Rental listing not found." }) : Ok(favorite);
    }

    [Authorize]
    [HttpDelete("favorites/{listingId:guid}")]
    public async Task<IActionResult> DeleteFavorite(Guid listingId, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(
            new CommandDefinition(
                "DELETE FROM favorite_properties WHERE user_id = @UserId AND property_id = @ListingId;",
                new { UserId = CurrentUserId, ListingId = listingId },
                cancellationToken: cancellationToken));
        return NoContent();
    }

    [Authorize]
    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var messages = await connection.QueryAsync(
            new CommandDefinition(
                """
                SELECT message.id, sender.full_name AS sender, recipient.full_name AS recipient,
                       message.sender_user_id AS "senderUserId",
                       message.recipient_user_id AS "recipientUserId",
                       message.message_body AS message, message.sent_at AS "createdAt"
                FROM user_messages AS message
                JOIN app_users AS sender ON sender.id = message.sender_user_id
                JOIN app_users AS recipient ON recipient.id = message.recipient_user_id
                WHERE message.sender_user_id = @UserId OR message.recipient_user_id = @UserId
                ORDER BY message.sent_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(messages);
    }

    [Authorize]
    [HttpPost("messages")]
    public async Task<IActionResult> CreateMessage(MessageRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Recipient) || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { message = "Recipient and message are required." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var message = await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                INSERT INTO user_messages (sender_user_id, recipient_user_id, subject, message_body)
                SELECT @UserId, recipient.id, 'WMS Rentals message', @Message
                FROM app_users AS recipient
                WHERE recipient.is_active = TRUE
                  AND (LOWER(recipient.username) = LOWER(@Recipient) OR LOWER(recipient.full_name) = LOWER(@Recipient))
                  AND recipient.id <> @UserId
                RETURNING id, sender_user_id AS "senderUserId", recipient_user_id AS "recipientUserId",
                          message_body AS message, sent_at AS "createdAt";
                """,
                new
                {
                    UserId = CurrentUserId,
                    Recipient = request.Recipient.Trim(),
                    Message = request.Message.Trim()
                },
                cancellationToken: cancellationToken));
        return message is null
            ? BadRequest(new { message = "Recipient must be another registered user. Use their username or full name." })
            : Ok(message);
    }

    [Authorize]
    [HttpDelete("messages/{id:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                "DELETE FROM user_messages WHERE id = @Id AND sender_user_id = @UserId;",
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Message not found." }) : NoContent();
    }

    private async Task<object?> GetProfileAsync(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                SELECT id, username, full_name AS name, email, phone, address, created_at AS "createdAt"
                FROM app_users WHERE id = @UserId AND is_active = TRUE;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
    }

    private async Task<IActionResult> SaveOrderAsync(Guid? id, OrderRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.OrderNumber) || request.OrderNumber.Trim().Length > 40
            || request.Quantity < 1)
            return BadRequest(new { message = "Enter an order number and a positive quantity." });
        string? status = OrderStatus(request.Status);
        if (status is null) return BadRequest(new { message = "Choose a valid order status." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var item = await connection.QuerySingleOrDefaultAsync<StockItemRow>(
            new CommandDefinition(
                """
                SELECT item.id, item.warehouse_id AS "WarehouseId", item.sku
                FROM inventory_items AS item
                JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE item.sku = @Sku AND item.warehouse_id = @WarehouseId
                  AND item.is_active = TRUE AND warehouse.owner_user_id = @UserId;
                """,
                new { request.Sku, request.WarehouseId, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (item is null) return BadRequest(new { message = "Choose an inventory item that belongs to a warehouse." });

        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        Guid orderId;
        if (id is null)
        {
            orderId = await connection.QuerySingleAsync<Guid>(
                new CommandDefinition(
                    """
                    INSERT INTO customer_orders (customer_user_id, order_number, status)
                    VALUES (@UserId, @OrderNumber, @Status) RETURNING id;
                    """,
                    new { UserId = CurrentUserId, OrderNumber = request.OrderNumber.Trim(), Status = status },
                    transaction,
                    cancellationToken: cancellationToken));
            await connection.ExecuteAsync(
                new CommandDefinition(
                    """
                    INSERT INTO order_items (order_id, inventory_item_id, sku_snapshot, item_name_snapshot, quantity, unit_price)
                    SELECT @OrderId, item.id, item.sku, item.name, @Quantity, 0
                    FROM inventory_items AS item WHERE item.id = @ItemId;
                    """,
                    new { OrderId = orderId, ItemId = item.Id, request.Quantity },
                    transaction,
                    cancellationToken: cancellationToken));
        }
        else
        {
            orderId = id.Value;
            int affected = await connection.ExecuteAsync(
                new CommandDefinition(
                    """
                    UPDATE customer_orders
                    SET order_number = @OrderNumber, status = @Status
                    WHERE id = @Id AND customer_user_id = @UserId;
                    """,
                    new { Id = orderId, UserId = CurrentUserId, OrderNumber = request.OrderNumber.Trim(), Status = status },
                    transaction,
                    cancellationToken: cancellationToken));
            if (affected == 0) return NotFound(new { message = "Order not found." });
            await connection.ExecuteAsync(
                new CommandDefinition(
                    """
                    UPDATE order_items AS line
                    SET inventory_item_id = item.id, sku_snapshot = item.sku,
                        item_name_snapshot = item.name, quantity = @Quantity
                    FROM inventory_items AS item
                    WHERE line.order_id = @OrderId AND item.id = @ItemId;
                    """,
                    new { OrderId = orderId, ItemId = item.Id, request.Quantity },
                    transaction,
                    cancellationToken: cancellationToken));
        }
        await transaction.CommitAsync(cancellationToken);
        var savedOrder = await connection.QuerySingleAsync<OrderRow>(
            new CommandDefinition(
                """
                SELECT orders.id, orders.order_number AS "orderNumber", orders.status,
                       orders.created_at AS "createdAt", orders.updated_at AS "updatedAt",
                       line.quantity AS "Quantity",
                       item.id AS "ItemId", item.sku AS "Sku", item.name AS "ItemName",
                       item.warehouse_id AS "WarehouseId"
                FROM customer_orders AS orders
                LEFT JOIN order_items AS line ON line.order_id = orders.id
                LEFT JOIN inventory_items AS item ON item.id = line.inventory_item_id
                WHERE orders.id = @Id AND orders.customer_user_id = @UserId;
                """,
                new { Id = orderId, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(ToOrderResponse(savedOrder));
    }

    private async Task<IActionResult> SaveListingAsync(Guid? id, ListingRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.City)
            || string.IsNullOrWhiteSpace(request.Type))
            return BadRequest(new { message = "Listing name, type, and location are required." });
        if (!TryParseNumber(request.Size, out decimal area) || area <= 0
            || !TryParseNumber(request.Price, out decimal price) || price < 0)
            return BadRequest(new { message = "Enter a positive listing size and a non-negative rent amount." });
        string propertyType = request.Type.ToUpperInvariant();
        if (propertyType is not ("WAREHOUSE" or "COMMERCIAL" or "RESIDENTIAL"))
            return BadRequest(new { message = "Choose a valid property type." });

        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        Guid propertyId;
        if (id is null)
        {
            propertyId = await connection.QuerySingleAsync<Guid>(
                new CommandDefinition(
                    """
                    INSERT INTO rental_properties (
                        owner_user_id, property_name, property_type, address, city, state,
                        area_sqft, monthly_rent, currency
                    )
                    VALUES (@UserId, @Name, @Type, @City, @City, @City, @Area, @Price, @Currency)
                    RETURNING id;
                    """,
                    new
                    {
                        UserId = CurrentUserId,
                        Name = request.Name.Trim(),
                        Type = propertyType,
                        City = request.City.Trim(),
                        Area = area,
                        Price = price,
                        Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant()
                    },
                    transaction,
                    cancellationToken: cancellationToken));
        }
        else
        {
            propertyId = id.Value;
            int affected = await connection.ExecuteAsync(
                new CommandDefinition(
                    """
                    UPDATE rental_properties
                    SET property_name = @Name, property_type = @Type, address = @City,
                        city = @City, state = @City, area_sqft = @Area, monthly_rent = @Price,
                        currency = @Currency
                    WHERE id = @Id AND owner_user_id = @UserId AND is_active = TRUE;
                    """,
                    new
                    {
                        Id = propertyId,
                        UserId = CurrentUserId,
                        Name = request.Name.Trim(),
                        Type = propertyType,
                        City = request.City.Trim(),
                        Area = area,
                        Price = price,
                        Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency.Trim().ToUpperInvariant()
                    },
                    transaction,
                    cancellationToken: cancellationToken));
            if (affected == 0) return NotFound(new { message = "Rental listing not found." });
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "DELETE FROM property_images WHERE property_id = @Id;",
                    new { Id = propertyId },
                    transaction,
                    cancellationToken: cancellationToken));
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "INSERT INTO property_images (property_id, image_url, display_order) VALUES (@Id, @ImageUrl, 0);",
                    new { Id = propertyId, ImageUrl = request.ImageUrl },
                    transaction,
                    cancellationToken: cancellationToken));
        }
        await transaction.CommitAsync(cancellationToken);
        var listing = await connection.QuerySingleAsync<ListingRow>(
            new CommandDefinition(
                """
                SELECT property.id, property.owner_user_id AS "ownerId",
                       property.property_name AS name, property.property_type AS type,
                       property.city, property.area_sqft AS "areaSqft",
                       property.monthly_rent AS price, property.currency,
                       (SELECT image_url FROM property_images
                        WHERE property_id = property.id ORDER BY display_order LIMIT 1) AS "imageUrl",
                       property.created_at AS "createdAt", property.updated_at AS "updatedAt"
                FROM rental_properties AS property WHERE property.id = @Id;
                """,
                new { Id = propertyId },
                cancellationToken: cancellationToken));
        return Ok(ToListingResponse(listing));
    }

    private static object ToOrderResponse(OrderRow order)
    {
        return new
        {
            order.Id,
            order.OrderNumber,
            status = order.Status switch { "PENDING" => "DRAFT", "CONFIRMED" => "PROCESSING", _ => order.Status },
            order.CreatedAt,
            order.UpdatedAt,
            order.Sku,
            order.Quantity,
            order.WarehouseId,
            item = order.ItemId is null ? null : new
            {
                id = order.ItemId,
                sku = order.Sku,
                name = order.ItemName,
                warehouseId = order.WarehouseId
            }
        };
    }

    private static object ToListingResponse(ListingRow listing)
    {
        return new
        {
            listing.Id,
            listing.OwnerId,
            listing.Name,
            listing.Type,
            listing.City,
            size = $"{listing.AreaSqft.ToString(CultureInfo.InvariantCulture)} sqft",
            listing.Price,
            listing.Currency,
            listing.ImageUrl,
            listing.CreatedAt,
            listing.UpdatedAt
        };
    }

    private static string? OrderStatus(string? value) => value?.ToUpperInvariant() switch
    {
        "DRAFT" or "PENDING" => "PENDING",
        "PROCESSING" => "PROCESSING",
        "COMPLETED" => "COMPLETED",
        "CANCELLED" => "CANCELLED",
        _ => null
    };

    private static string? BookingStatus(string? value) => value?.ToUpperInvariant() switch
    {
        "REQUESTED" or "PENDING" => "PENDING",
        "CONFIRMED" or "APPROVED" => "APPROVED",
        "ACTIVE" => "ACTIVE",
        "COMPLETED" => "COMPLETED",
        "CANCELLED" => "CANCELLED",
        "REJECTED" => "REJECTED",
        _ => null
    };

    private static bool TryParseNumber(string? value, out decimal number)
    {
        string digits = Regex.Replace(value ?? "", @"[^0-9.,-]", "").Replace(",", "");
        return decimal.TryParse(digits, NumberStyles.Number, CultureInfo.InvariantCulture, out number);
    }

    public sealed record ProfileRequest(string Name, string Username, string Email, string? Phone, string? Address);
    public sealed record SettingsRequest(int LowStockThreshold, string? Density, bool ShowNotifications);
    public sealed record OrderRequest(string OrderNumber, string Status, int Quantity, string? Sku, Guid? WarehouseId);
    public sealed record ListingRequest(string Name, string Type, string City, string Size, string Price, string? ImageUrl, string? Currency);
    public sealed record BookingRequest(Guid ListingId, string Customer, DateOnly StartDate, string Status);
    public sealed record BookingUpdateRequest(Guid ListingId, string Customer, DateOnly StartDate, string Status);
    public sealed record MessageRequest(string Sender, string Recipient, string Message);

    private sealed record StockItemRow(Guid Id, Guid WarehouseId, string Sku);
    private sealed class OrderRow
    {
        public Guid Id { get; init; }
        public string OrderNumber { get; init; } = "";
        public string Status { get; init; } = "";
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
        public int? Quantity { get; init; }
        public Guid? ItemId { get; init; }
        public string? Sku { get; init; }
        public string? ItemName { get; init; }
        public Guid? WarehouseId { get; init; }
    }

    private sealed record ListingRow(
        Guid Id,
        Guid OwnerId,
        string Name,
        string Type,
        string City,
        decimal AreaSqft,
        decimal Price,
        string Currency,
        string? ImageUrl,
        DateTime CreatedAt,
        DateTime UpdatedAt);
}
