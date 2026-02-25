DROP TABLE IF EXISTS OrderHistories;
DROP TABLE IF EXISTS Orders;

CREATE TABLE Orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_name VARCHAR(64) NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    address TEXT NOT NULL,
    quantity INT NOT NULL,
    notes TEXT,
    shipping VARCHAR(32) NOT NULL,
    product VARCHAR(64) NOT NULL,
    order_date DATETIME NOT NULL
);

CREATE TABLE OrderHistories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    shipping VARCHAR(32),
    address TEXT,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES Orders(id)
        ON DELETE CASCADE
);