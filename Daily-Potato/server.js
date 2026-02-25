const express = require('express')
const { addOrder } = require("./data");
const { updateOrder } = require("./data");
const { getOrder } = require("./data");
const { getOrderHistory } = require("./data");
const { updateOrderStatuses } = require("./data");
const { getOrders } = require("./data");
const path = require("path");
const app = express()
const port = 4131

app.set("views", path.join(__dirname, "templates"))
app.set("view engine", "pug")

app.use(express.json())

app.use("/css", express.static(path.join(__dirname, "resources/css")))
app.use("/js", express.static(path.join(__dirname, "resources/js")))
app.use("/images", express.static(path.join(__dirname, "resources/images")))

app.use(express.urlencoded({ extended: true }));

function createOrder(data) {
    const requiredFields = ["product", "from_name", "quantity", "address", "shipping"];
    const missingFields = requiredFields.filter(f => !(f in data));
    if (missingFields.length > 0) {
        return { status: 400, response: { status: "error", errors: missingFields.map(f => `Missing field: ${f}`) } };
    }

    const { product, from_name, quantity, address, shipping } = data;

    if (from_name.length >= 64) {
        return { status: 413, response: { status: "error", errors: ["Name too long (max 63 chars)"] }};
    }

    if (address.length >= 1024) {
        return { status: 413, response: { status: "error", errors: ["Address too long (max 1023 chars)"] }};
    }
    
    const validProducts = ["Happy Potato", "Sad Potato", "Angry Potato", "Potato with Message"];
    const validShipping = ["Flat Rate", "Ground", "Expedited"];
    const errors = [];

    if (!validProducts.includes(product)) { 
        errors.push("Unrecognized product");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) { 
        errors.push("Quantity must be a positive integer");
    }
    if (!validShipping.includes(shipping)) {
        errors.push("Invalid shipping method");
    }
    
    if (errors.length > 0) {
        return { status: 400, response: { status: "error", errors } };
    }
    const productPrices = {
        "Happy Potato": 15.00,
        "Sad Potato": 12.00,
        "Angry Potato": 10.00,
        "Potato with Message": 20.00
    };
    const totalCost = productPrices[product] * quantity;

    const orderData = {
        from_name,
        cost: totalCost,
        status: "Placed",
        address,
        quantity,
        notes: "",
        shipping,
        product,
        order_date: new Date()
    };

    return { status: 201, response: { status: "success" }, cookie: from_name, orderData };
}

app.get(['/', 'about'], (req, res) => {
    res.status(200)
    res.render('about')
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.get('/admin/orders', async (req, res) => {
    const query = req.query.query || null;     
    const status = req.query.status || null;    
    try {
        const ordersFromDB = await getOrders(query, status);

        if (!Array.isArray(ordersFromDB)) {
            return res.status(500).send("Error fetching orders from database");
        }

        res.status(200).render('admin_orders', { orders: ordersFromDB });
    } catch (err) {
        console.error("Error in /admin/orders route:", err);
        res.status(500).send("Internal server error");
    }
});

app.get("/tracking/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        await updateOrderStatuses();
        const order = await getOrder(id);
        if (!order) {
            return res.status(404).render("404");
        }
        if (order.address) {
            order.address_html = order.address.replace(/\n/g, "<br>");
        }
        res.render("tracking", { order });
    } catch (err) {
        console.error(err);
        return res.status(500).render("500");
    }
});


app.get('/order', (req, res) => {
    res.status(200)
    res.render('order')
});

app.post('/api/order', async (req, res) => {
    if (!req.is("application/json")) {
        return res.status(400).json({ status: "error", errors: ["Content-Type must be application/json"] });
    }

    const result = createOrder(req.body);

    if (result.status !== 201) {
        return res.status(result.status).json(result.response);
    }
    if (result.cookie) {
        res.cookie("customer_name", result.cookie, { path: "/" });
    }
    try {
        const dbInsert = await addOrder(result.orderData);
        return res.status(201).json({ status: "success", order_id: dbInsert.insertId });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "error",
            errors: ["Database error when placing order"]
        });
    }
});

app.delete("/api/cancel_order", async (req, res) => {
    if (!req.is("application/json")) {
        return res.status(400).json({
            status: "error",
            errors: ["Content-Type must be application/json"]
        });
    }
    const { order_id } = req.body;

    if (typeof order_id !== "number") {
        return res.status(400).json({
            status: "error",
            errors: ["Invalid or missing order_id"]
        });
    }
    try {
        const affected = await cancelOrder(order_id);
        if (affected === 0) {
            return res.status(400).json({
                status: "error",
                errors: ["Order not found or cannot be cancelled"]
            });
        }
        return res.status(204).send();  
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "error",
            errors: ["Internal server error"]
        });
    }
});

app.post('/update_shipping', async (req, res) => {
    const { id, shipping, address } = req.body;

    try {
        const result = await updateOrder(Number(id), shipping, address);

        if (result.updated) {
            return res.render("order_success", { order_id: id });
        } else {
            return res.render("order_fail");
        }

    } catch (err) {
        console.error("update_shipping error:", err);
        return res.render("order_fail");
    }
});

app.get("/api/order/:id/history", async (req, res) => {
    const orderId = Number(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ status: "error", errors: ["Invalid order ID"] });
    }
    try {
      const history = await getOrderHistory(orderId);
  
      if (!history || history.length === 0) {
        return res.status(404).json({ status: "error", errors: ["No history found for this order"] });
      }
  
      res.status(200).json({ status: "success", history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: "error", errors: ["Database error when fetching order history"] });
    }
  });  

app.use((req, res) => {
    res.status(404).render("404");
});

app.listen(port, () => {
    console.log("Server running on http://localhost:4131")
})