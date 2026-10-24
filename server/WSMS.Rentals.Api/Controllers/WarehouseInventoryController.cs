using Dapper;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using WSMS.Rentals.Api.Data;

namespace WSMS.Rentals.Api.Controllers;

[Route("api")]
public sealed class WarehouseInventoryController : AuthenticatedControllerBase
{
    private readonly IDbConnectionFactory connectionFactory;

    public WarehouseInventoryController(IDbConnectionFactory connectionFactory)
    {
        this.connectionFactory = connectionFactory;
    }

    [HttpGet("warehouses")]
    public async Task<IActionResult> GetWarehouses(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var warehouses = await connection.QueryAsync(
            new CommandDefinition(
                """
                SELECT id, name, city AS location, capacity_area_sqft AS capacity, description AS notes,
                       created_at AS "createdAt", updated_at AS "updatedAt"
                FROM warehouses
                WHERE owner_user_id = @UserId AND is_active = TRUE
                ORDER BY created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(warehouses);
    }

    [HttpPost("warehouses")]
    public async Task<IActionResult> CreateWarehouse(WarehouseRequest request, CancellationToken cancellationToken)
    {
        if (request is null) return BadRequest(new { message = "Warehouse details are required." });
        if (!ValidWarehouse(request, out string error)) return BadRequest(new { message = error });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var warehouse = await connection.QuerySingleAsync(
            new CommandDefinition(
                """
                INSERT INTO warehouses (owner_user_id, name, address, city, state, capacity_area_sqft, description)
                VALUES (@UserId, @Name, @Location, @Location, @Location, @Capacity, @Notes)
                RETURNING id, name, city AS location, capacity_area_sqft AS capacity, description AS notes,
                          created_at AS "createdAt", updated_at AS "updatedAt";
                """,
                WarehouseParameters(request),
                cancellationToken: cancellationToken));
        return Ok(warehouse);
    }

    [HttpPut("warehouses/{id:guid}")]
    public async Task<IActionResult> UpdateWarehouse(Guid id, WarehouseRequest request, CancellationToken cancellationToken)
    {
        if (request is null) return BadRequest(new { message = "Warehouse details are required." });
        if (!ValidWarehouse(request, out string error)) return BadRequest(new { message = error });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var parameters = WarehouseParameters(request);
        var result = await connection.QuerySingleOrDefaultAsync(
            new CommandDefinition(
                """
                UPDATE warehouses
                SET name = @Name, address = @Location, city = @Location, state = @Location,
                    capacity_area_sqft = @Capacity, description = @Notes
                WHERE id = @Id AND owner_user_id = @UserId AND is_active = TRUE
                RETURNING id, name, city AS location, capacity_area_sqft AS capacity, description AS notes,
                          created_at AS "createdAt", updated_at AS "updatedAt";
                """,
                new { parameters.Name, parameters.Location, parameters.Capacity, parameters.Notes, Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return result is null ? NotFound(new { message = "Warehouse not found." }) : Ok(result);
    }

    [HttpDelete("warehouses/{id:guid}")]
    public async Task<IActionResult> DeleteWarehouse(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int inventoryCount = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(
                """
                SELECT COUNT(*) FROM inventory_items
                WHERE warehouse_id = @Id AND is_active = TRUE
                  AND EXISTS (
                      SELECT 1 FROM warehouses
                      WHERE warehouses.id = inventory_items.warehouse_id
                        AND warehouses.owner_user_id = @UserId
                  );
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (inventoryCount > 0)
            return Conflict(new { message = "Move or remove this warehouse’s inventory before deleting it." });

        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                "UPDATE warehouses SET is_active = FALSE WHERE id = @Id AND owner_user_id = @UserId AND is_active = TRUE;",
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Warehouse not found." }) : NoContent();
    }

    [HttpGet("inventory")]
    public async Task<IActionResult> GetInventory(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var items = (await connection.QueryAsync<InventoryRow>(
            new CommandDefinition(
                """
                SELECT item.id, item.warehouse_id AS "WarehouseId", item.sku, item.name, item.category,
                       item.current_quantity AS quantity, item.updated_at AS "updatedAt",
                       warehouse.id AS "WarehouseRecordId", warehouse.name AS "WarehouseName",
                       warehouse.city AS "WarehouseLocation", warehouse.capacity_area_sqft AS "WarehouseCapacity",
                       warehouse.description AS "WarehouseNotes"
                FROM inventory_items AS item
                JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE warehouse.owner_user_id = @UserId AND warehouse.is_active = TRUE AND item.is_active = TRUE
                ORDER BY item.created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken))).AsList();
        var images = (await connection.QueryAsync<ImageRow>(
            new CommandDefinition(
                """
                SELECT images.id, images.inventory_item_id AS "ItemId", images.image_url AS url
                FROM inventory_item_images AS images
                JOIN inventory_items AS item ON item.id = images.inventory_item_id
                JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE warehouse.owner_user_id = @UserId AND item.is_active = TRUE
                ORDER BY images.display_order;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken))).AsList();
        return Ok(items.Select(item => InventoryResponse(item, images.Where(image => image.ItemId == item.Id))));
    }

    [HttpPost("inventory")]
    public async Task<IActionResult> ReceiveInventory(InventoryRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity < 1 || string.IsNullOrWhiteSpace(request.Sku) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Item name, SKU, and a positive quantity are required." });

        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        var warehouse = await connection.QuerySingleOrDefaultAsync<WarehouseRow>(
            new CommandDefinition(
                """
                SELECT id, name, city AS location, capacity_area_sqft AS capacity, description AS notes
                FROM warehouses WHERE id = @Id AND owner_user_id = @UserId AND is_active = TRUE
                FOR UPDATE;
                """,
                new { Id = request.WarehouseId, UserId = CurrentUserId },
                transaction,
                cancellationToken: cancellationToken));
        if (warehouse is null) return NotFound(new { message = "Warehouse not found." });

        Guid? itemId = await connection.QuerySingleOrDefaultAsync<Guid?>(
            new CommandDefinition(
                """
                SELECT id FROM inventory_items
                WHERE warehouse_id = @WarehouseId AND sku = @Sku AND is_active = TRUE
                FOR UPDATE;
                """,
                new { request.WarehouseId, request.Sku },
                transaction,
                cancellationToken: cancellationToken));
        if (itemId is null)
        {
            itemId = await connection.QuerySingleAsync<Guid>(
                new CommandDefinition(
                    """
                    INSERT INTO inventory_items (warehouse_id, sku, name, category, current_quantity)
                    VALUES (@WarehouseId, @Sku, @Name, @Category, 0)
                    RETURNING id;
                    """,
                    new
                    {
                        request.WarehouseId,
                        Sku = request.Sku.Trim(),
                        Name = request.Name.Trim(),
                        Category = string.IsNullOrWhiteSpace(request.Category) ? "Uncategorized" : request.Category.Trim()
                    },
                    transaction,
                    cancellationToken: cancellationToken));
        }
        else
        {
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "UPDATE inventory_items SET name = @Name, category = @Category WHERE id = @Id;",
                    new
                    {
                        Name = request.Name.Trim(),
                        Category = string.IsNullOrWhiteSpace(request.Category) ? "Uncategorized" : request.Category.Trim(),
                        Id = itemId
                    },
                    transaction,
                    cancellationToken: cancellationToken));
        }

        await AddImagesAsync(connection, transaction, itemId.Value, request.Images ?? [], cancellationToken);
        await InsertMovementAsync(
            connection,
            transaction,
            request.WarehouseId,
            itemId.Value,
            CurrentUserId,
            "IN",
            request.Quantity,
            "Initial stock receipt",
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetInventoryItemResultAsync(connection, itemId.Value, cancellationToken);
    }

    [HttpPut("inventory/{id:guid}")]
    public async Task<IActionResult> UpdateInventory(Guid id, InventoryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Sku))
            return BadRequest(new { message = "Item name and SKU are required." });

        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                """
                UPDATE inventory_items AS item
                SET warehouse_id = @WarehouseId, sku = @Sku, name = @Name,
                    category = @Category
                WHERE item.id = @Id AND item.is_active = TRUE
                  AND EXISTS (
                      SELECT 1 FROM warehouses AS warehouse
                      WHERE warehouse.id = item.warehouse_id AND warehouse.owner_user_id = @UserId
                  )
                  AND EXISTS (
                      SELECT 1 FROM warehouses AS target
                      WHERE target.id = @WarehouseId AND target.owner_user_id = @UserId AND target.is_active = TRUE
                  );
                """,
                new
                {
                    Id = id,
                    UserId = CurrentUserId,
                    request.WarehouseId,
                    Sku = request.Sku.Trim(),
                    Name = request.Name.Trim(),
                    Category = string.IsNullOrWhiteSpace(request.Category) ? "Uncategorized" : request.Category.Trim()
                },
                transaction,
                cancellationToken: cancellationToken));
        if (affected == 0) return NotFound(new { message = "Inventory item or warehouse not found." });

        if (request.Images is not null)
        {
            await connection.ExecuteAsync(
                new CommandDefinition(
                    "DELETE FROM inventory_item_images WHERE inventory_item_id = @Id;",
                    new { Id = id },
                    transaction,
                    cancellationToken: cancellationToken));
            await AddImagesAsync(connection, transaction, id, request.Images, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return await GetInventoryItemResultAsync(connection, id, cancellationToken);
    }

    [HttpDelete("inventory/{id:guid}")]
    public async Task<IActionResult> DeleteInventory(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                """
                UPDATE inventory_items AS item SET is_active = FALSE
                WHERE item.id = @Id AND item.is_active = TRUE
                  AND EXISTS (
                      SELECT 1 FROM warehouses AS warehouse
                      WHERE warehouse.id = item.warehouse_id AND warehouse.owner_user_id = @UserId
                  );
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return affected == 0 ? NotFound(new { message = "Inventory item not found." }) : NoContent();
    }

    [HttpPost("inventory/{id:guid}/adjust")]
    public async Task<IActionResult> AdjustInventory(Guid id, StockAdjustmentRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity < 1 || request.Type is not ("RECEIVE" or "ISSUE"))
            return BadRequest(new { message = "Use RECEIVE or ISSUE and enter a positive quantity." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var item = await connection.QuerySingleOrDefaultAsync<StockItemRow>(
            new CommandDefinition(
                """
                SELECT item.id, item.warehouse_id AS "WarehouseId", item.sku
                FROM inventory_items AS item JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE item.id = @Id AND item.is_active = TRUE AND warehouse.owner_user_id = @UserId;
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (item is null) return NotFound(new { message = "Inventory item not found." });
        return await CreateMovementAsync(
            connection,
            item.WarehouseId,
            id,
            item.Sku,
            request.Type,
            request.Quantity,
            request.Reference,
            cancellationToken);
    }

    [HttpGet("stock-movements")]
    public async Task<IActionResult> GetStockMovements(CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var records = await connection.QueryAsync(
            new CommandDefinition(
                """
                SELECT movement.id, movement.warehouse_id AS "warehouseId", warehouse.name AS "warehouseName",
                       item.sku, item.name AS "itemName",
                       CASE movement.movement_type WHEN 'IN' THEN 'RECEIVE' ELSE 'ISSUE' END AS type,
                       movement.quantity, movement.reference, movement.created_at AS "createdAt"
                FROM stock_movements AS movement
                JOIN warehouses AS warehouse ON warehouse.id = movement.warehouse_id
                JOIN inventory_items AS item ON item.id = movement.inventory_item_id
                WHERE warehouse.owner_user_id = @UserId AND movement.voided_at IS NULL
                ORDER BY movement.created_at DESC;
                """,
                new { UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        return Ok(records);
    }

    [HttpDelete("stock-movements/{id:guid}")]
    public async Task<IActionResult> VoidStockMovement(Guid id, CancellationToken cancellationToken)
    {
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        StockMovementRow? movement = await connection.QuerySingleOrDefaultAsync<StockMovementRow>(
            new CommandDefinition(
                """
                SELECT movement.id, movement.warehouse_id AS "WarehouseId",
                       movement.inventory_item_id AS "InventoryItemId",
                       movement.movement_type AS "MovementType", movement.quantity,
                       movement.reference, item.current_quantity AS "CurrentQuantity",
                       warehouse.is_active AS "WarehouseIsActive"
                FROM stock_movements AS movement
                JOIN warehouses AS warehouse ON warehouse.id = movement.warehouse_id
                JOIN inventory_items AS item ON item.id = movement.inventory_item_id
                WHERE movement.id = @Id AND warehouse.owner_user_id = @UserId
                  AND movement.voided_at IS NULL
                FOR UPDATE OF movement, item;
                """,
                new { Id = id, UserId = CurrentUserId },
                transaction,
                cancellationToken: cancellationToken));
        if (movement is null) return NotFound(new { message = "Stock movement not found." });
        if ((movement.MovementType == "IN" && movement.CurrentQuantity < movement.Quantity)
            || (movement.MovementType == "OUT" && !movement.WarehouseIsActive))
        {
            return Conflict(new
            {
                message = movement.MovementType == "IN"
                    ? "This receipt cannot be voided because some of its stock has already been issued."
                    : "This issue cannot be voided while its warehouse is inactive."
            });
        }

        await InsertMovementAsync(
            connection,
            transaction,
            movement.WarehouseId,
            movement.InventoryItemId,
            CurrentUserId,
            movement.MovementType == "IN" ? "OUT" : "IN",
            movement.Quantity,
            $"VOID-{movement.Id}",
            cancellationToken);
        int affected = await connection.ExecuteAsync(
            new CommandDefinition(
                """
                UPDATE stock_movements
                SET voided_at = NOW(), voided_by_user_id = @UserId
                WHERE id = @Id AND voided_at IS NULL;
                """,
                new { Id = movement.Id, UserId = CurrentUserId },
                transaction,
                cancellationToken: cancellationToken));
        if (affected == 0) return Conflict(new { message = "Stock movement has already been voided." });

        await transaction.CommitAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("stock-movements")]
    public async Task<IActionResult> CreateStockMovement(StockMovementRequest request, CancellationToken cancellationToken)
    {
        if (request.Quantity < 1 || request.Type is not ("RECEIVE" or "ISSUE"))
            return BadRequest(new { message = "Use RECEIVE or ISSUE and enter a positive quantity." });
        await using NpgsqlConnection connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        var item = await connection.QuerySingleOrDefaultAsync<StockItemRow>(
            new CommandDefinition(
                """
                SELECT item.id, item.warehouse_id AS "WarehouseId", item.sku
                FROM inventory_items AS item
                JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE item.warehouse_id = @WarehouseId AND item.sku = @Sku
                  AND item.is_active = TRUE AND warehouse.owner_user_id = @UserId;
                """,
                new { request.WarehouseId, request.Sku, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (item is null) return NotFound(new { message = "Inventory item not found in this warehouse." });
        return await CreateMovementAsync(
            connection,
            request.WarehouseId,
            item.Id,
            item.Sku,
            request.Type,
            request.Quantity,
            request.Reference,
            cancellationToken);
    }

    private async Task<IActionResult> CreateMovementAsync(
        NpgsqlConnection connection,
        Guid warehouseId,
        Guid itemId,
        string sku,
        string type,
        int quantity,
        string? reference,
        CancellationToken cancellationToken)
    {
        await using NpgsqlTransaction transaction = await connection.BeginTransactionAsync(cancellationToken);
        var result = await InsertMovementAsync(
            connection,
            transaction,
            warehouseId,
            itemId,
            CurrentUserId,
            type == "RECEIVE" ? "IN" : "OUT",
            quantity,
            reference,
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var movement = await connection.QuerySingleAsync(
            new CommandDefinition(
                """
                SELECT movement.id, movement.warehouse_id AS "warehouseId", warehouse.name AS "warehouseName",
                       item.sku, item.name AS "itemName",
                       CASE movement.movement_type WHEN 'IN' THEN 'RECEIVE' ELSE 'ISSUE' END AS type,
                       movement.quantity, movement.reference, movement.created_at AS "createdAt"
                FROM stock_movements AS movement
                JOIN warehouses AS warehouse ON warehouse.id = movement.warehouse_id
                JOIN inventory_items AS item ON item.id = movement.inventory_item_id
                WHERE movement.id = @Id;
                """,
                new { Id = result.Id },
                cancellationToken: cancellationToken));
        return Ok(movement);
    }

    private static async Task<MovementInsertResult> InsertMovementAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid warehouseId,
        Guid itemId,
        Guid userId,
        string type,
        int quantity,
        string? reference,
        CancellationToken cancellationToken)
    {
        return await connection.QuerySingleAsync<MovementInsertResult>(
            new CommandDefinition(
                """
                INSERT INTO stock_movements (
                    warehouse_id, inventory_item_id, performed_by_user_id, movement_type,
                    quantity, previous_quantity, new_quantity, reference
                )
                VALUES (@WarehouseId, @ItemId, @UserId, @Type, @Quantity, 0, 0, @Reference)
                RETURNING id;
                """,
                new
                {
                    WarehouseId = warehouseId,
                    ItemId = itemId,
                    UserId = userId,
                    Type = type,
                    Quantity = quantity,
                    Reference = string.IsNullOrWhiteSpace(reference) ? null : reference.Trim()
                },
                transaction,
                cancellationToken: cancellationToken));
    }

    private static async Task AddImagesAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        Guid itemId,
        IReadOnlyList<string> images,
        CancellationToken cancellationToken)
    {
        for (int index = 0; index < images.Count; index++)
        {
            if (string.IsNullOrWhiteSpace(images[index])) continue;
            await connection.ExecuteAsync(
                new CommandDefinition(
                    """
                    INSERT INTO inventory_item_images (inventory_item_id, image_url, display_order)
                    VALUES (@ItemId, @Url, @DisplayOrder);
                    """,
                    new { ItemId = itemId, Url = images[index], DisplayOrder = index },
                    transaction,
                    cancellationToken: cancellationToken));
        }
    }

    private async Task<IActionResult> GetInventoryItemResultAsync(
        NpgsqlConnection connection,
        Guid id,
        CancellationToken cancellationToken)
    {
        InventoryRow? item = await connection.QuerySingleOrDefaultAsync<InventoryRow>(
            new CommandDefinition(
                """
                SELECT item.id, item.warehouse_id AS "WarehouseId", item.sku, item.name, item.category,
                       item.current_quantity AS quantity, item.updated_at AS "updatedAt",
                       warehouse.id AS "WarehouseRecordId", warehouse.name AS "WarehouseName",
                       warehouse.city AS "WarehouseLocation", warehouse.capacity_area_sqft AS "WarehouseCapacity",
                       warehouse.description AS "WarehouseNotes"
                FROM inventory_items AS item
                JOIN warehouses AS warehouse ON warehouse.id = item.warehouse_id
                WHERE item.id = @Id AND item.is_active = TRUE AND warehouse.owner_user_id = @UserId;
                """,
                new { Id = id, UserId = CurrentUserId },
                cancellationToken: cancellationToken));
        if (item is null) return NotFound(new { message = "Inventory item not found." });
        var images = await connection.QueryAsync<ImageRow>(
            new CommandDefinition(
                """
                SELECT id, image_url AS url, inventory_item_id AS "ItemId"
                FROM inventory_item_images WHERE inventory_item_id = @Id ORDER BY display_order;
                """,
                new { Id = id },
                cancellationToken: cancellationToken));
        return Ok(InventoryResponse(item, images));
    }

    private static object InventoryResponse(InventoryRow item, IEnumerable<ImageRow> images)
    {
        return new
        {
            item.Id,
            item.Sku,
            item.Name,
            item.Category,
            item.Quantity,
            item.WarehouseId,
            item.UpdatedAt,
            images = images.Select(image => new { image.Id, image.Url }),
            warehouse = new
            {
                id = item.WarehouseRecordId,
                name = item.WarehouseName,
                location = item.WarehouseLocation,
                capacity = item.WarehouseCapacity,
                notes = item.WarehouseNotes
            }
        };
    }

    private static bool ValidWarehouse(WarehouseRequest request, out string error)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Location))
        {
            error = "Warehouse name and location are required.";
            return false;
        }

        decimal capacity = request.Capacity;
        if (capacity <= 0 || capacity > 999_999_999_999.99m)
        {
            error = "Warehouse fields exceed their allowed limits or the capacity is not positive.";
            return false;
        }

        if (request.Name.Trim().Length > 160 || request.Location.Trim().Length > 100 || request.Notes?.Length > 5000)
        {
            error = "Warehouse fields exceed their allowed limits or the capacity is not positive.";
            return false;
        }
        error = "";
        return true;
    }

    private WarehouseParametersRecord WarehouseParameters(WarehouseRequest request)
    {
        return new WarehouseParametersRecord(
            CurrentUserId,
            request.Name.Trim(),
            request.Location.Trim(),
            request.Capacity,
            string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim());
    }

    public sealed record WarehouseRequest(string Name, string Location, decimal Capacity, string? Notes);
    public sealed record InventoryRequest(Guid WarehouseId, string Name, string Sku, string? Category, int Quantity, List<string>? Images);
    public sealed record StockAdjustmentRequest(string Type, int Quantity, string? Reference);
    public sealed record StockMovementRequest(Guid WarehouseId, string Sku, string Type, int Quantity, string? Reference);

    private sealed record WarehouseParametersRecord(Guid UserId, string Name, string Location, decimal Capacity, string? Notes);
    private sealed record WarehouseRow(Guid Id, string Name, string Location, decimal Capacity, string? Notes);
    private sealed record MovementInsertResult(Guid Id);
    private sealed record StockItemRow(Guid Id, Guid WarehouseId, string Sku);
    private sealed record StockMovementRow(
        Guid Id,
        Guid WarehouseId,
        Guid InventoryItemId,
        string MovementType,
        int Quantity,
        string? Reference,
        int CurrentQuantity,
        bool WarehouseIsActive);
    private sealed record ImageRow(Guid Id, Guid ItemId, string Url);
    private sealed class InventoryRow
    {
        public Guid Id { get; init; }
        public Guid WarehouseId { get; init; }
        public string Sku { get; init; } = "";
        public string Name { get; init; } = "";
        public string Category { get; init; } = "";
        public int Quantity { get; init; }
        public DateTime UpdatedAt { get; init; }
        public Guid WarehouseRecordId { get; init; }
        public string WarehouseName { get; init; } = "";
        public string WarehouseLocation { get; init; } = "";
        public decimal WarehouseCapacity { get; init; }
        public string? WarehouseNotes { get; init; }
    }
}
