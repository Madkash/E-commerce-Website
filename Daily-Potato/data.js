const mysql = require("mysql2/promise");

var connPool = mysql.createPool({
  connectionLimit: 5, // it's a shared resource, let's not go nuts.
  host: "127.0.0.1", // this will work
  user: "",
  database: "",
  password: "",  // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
});

async function addOrder(data) {
  const conn = await connPool.getConnection();
  try {
    await conn.beginTransaction();
    const sql = `
    INSERT INTO Orders
      (from_name, cost, status, address, quantity, notes, shipping, product, order_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    const params = [
      data.from_name,
      data.cost,
      data.status,
      data.address,
      data.quantity,
      data.notes || "",
      data.shipping,
      data.product,
      data.order_date,
    ];
    const [result] = await conn.execute(sql, params);
    const orderId = result.insertId;

    const historySql = `
      INSERT INTO OrderHistories (order_id, shipping, address, update_time)
      VALUES (?, ?, ?, NOW())
    `;
    await conn.execute(historySql, [orderId, data.shipping, data.address]);

    await conn.commit(); 
    return { success: true, order_id: orderId };
  } catch (err) {
    await conn.rollback();
    console.error("addOrder ERROR:", err);
    return {success: false, error: "Database insert failed", details: err,};
  } finally {
    conn.release();
  }
}

async function getOrders(query, status) {
  const conn = await connPool.getConnection();
  try {
    let sql = `
      SELECT order_id, from_name, cost, status, address, quantity,
             notes, shipping, product, order_date
      FROM orders
      WHERE 1=1
    `;
    
    const params = [];

    // If a search query was provided (partial match)
    if (query) {
      sql += ` AND (from_name LIKE ? OR address LIKE ?)`;
      const like = `%${query}%`;
      params.push(like, like);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY order_date DESC`;

    const [rows] = await conn.execute(sql, params);
    return rows; 

  } catch (err) {
    console.error("DB getOrders error:", err);
    return { success: false, error: err.message };
  } finally {
    conn.release();
  }
}

async function updateOrder(id, shipping, address) {
  const conn = await connPool.getConnection();
  try {
      const updates = [];
      const params = [];

      if (shipping !== undefined && shipping !== null) {
        updates.push("shipping = ?");
        params.push(shipping);
      }

      if (address !== undefined && address !== null) {
        updates.push("address = ?");
        params.push(address);
      }

      if (updates.length === 0) {
        return { updated: false, reason: "No fields provided" };
      }

      params.push(id); 

      const sql = `
          UPDATE Orders
          SET ${updates.join(", ")}
          WHERE id = ?
      `;

      const [result] = await conn.execute(sql, params);

      if (result.affectedRows === 0) {
        return { updated: false, reason: "Order not found" };
      }

      const historySql = `
          INSERT INTO OrderHistories (order_id, shipping, address, update_time)
          VALUES (?, ?, ?, NOW())
      `;
      await conn.execute(historySql, [
          id,
          shipping !== undefined ? shipping : null,
          address !== undefined ? address : null
      ]);

      return { updated: true };

  } finally {
      conn.release();
  }
}

async function cancelOrder(id) {
  const [result] = await db.execute(
    "UPDATE Orders SET status = 'Cancelled' WHERE id = ? AND status NOT IN ('Cancelled', 'Shipped', 'Delivered')",
    [id]
);

return result.affectedRows;
}

async function getOrder(orderId) {
  const [rows] = await db.execute(
    "SELECT * FROM Orders WHERE id = ?",
    [id]
);

return rows.length > 0 ? rows[0] : null;
}

async function updateOrderStatuses() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const sql = `
        UPDATE Orders
        SET status = 'Shipped'
        WHERE status = 'Placed' AND order_date < ?
    `;

    const [result] = await connPool.execute(sql, [fiveMinutesAgo]);
    return result;
}

async function getOrderHistory(id) {
  const conn = await connPool.getConnection();
  try {
    const sql = `
      SELECT shipping, address, update_time
      FROM OrderHistories
      WHERE order_id = ?
      ORDER BY update_time DESC
      LIMIT 5
    `;
    const [rows] = await conn.execute(sql, [orderId]);
    return rows; 
  } catch (err) {
    console.error("getOrderHistory ERROR:", err);
    return { success: false, error: "Database query failed", details: err };
  } finally {
    conn.release();
  }
}

module.exports = {
  getOrder,
  addOrder,
  getOrders,
  updateOrderStatuses,
  updateOrder,
  cancelOrder,
  getOrderHistory,
};
