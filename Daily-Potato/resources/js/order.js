function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleString();
  }

  setInterval(updateClock, 1000); 
  updateClock();

  function prefillForm() {
    document.getElementById("product").value = "15";
    document.getElementById("quantityContainer").style.display = "block";
    document.getElementById("quantity").value = 1;
    document.getElementById("from").value = "Pikachu";
    document.getElementById("address").value = "Goldy: 909 Gold Street, Duluth, MN 76234";
    const flatRate = document.querySelector('input[name="shipping"][value="Flat Rate"]');
    flatRate.checked = true;
    const productPrice = document.getElementById("product").value;
    const quantity = document.getElementById("quantity").value;
    const totalCost = document.getElementById("totalCost");
    const total = Number(productPrice) * Number(quantity);
    totalCost.textContent = `Total Cost: $${total.toFixed(2)}`;
  }

  function handleProductChange() {
    const productPrice = document.getElementById("product").value;
    const quantityContainer = document.getElementById("quantityContainer");
  
    if (productPrice) {
      quantityContainer.style.display = "block";
    } else {
      quantityContainer.style.display = "none";
      document.getElementById("quantity").value = "";
    }
    updateTotal();
  }

  function updateTotal() {
    const productPrice = document.getElementById("product").value;
    const quantity = document.getElementById("quantity").value
    const totalCost = document.getElementById("totalCost");

    if (!productPrice || !quantity || quantity <= 0) {
        totalCost.textContent = "Total Cost: Select a product and quantity for cost information.";
        return;
  }
  const total = Number(productPrice) * Number(quantity);
  totalCost.textContent = `Total Cost: $${total.toFixed(2)}`;
}

async function submitOrder(event) {
  event.preventDefault()
  const productElement = document.getElementById("product");
  const productValue = productElement.value;
  const productText = productElement.options[productElement.selectedIndex].text.split(" - ")[0];
  const data = {
    product: productText,
    from_name: document.getElementById("from").value,
    quantity: parseInt(document.getElementById("quantity").value),
    address: document.getElementById("address").value,
    shipping: document.querySelector('input[name="shipping"]:checked')?.value
  };
  if (!data.product || !data.from_name || !data.quantity || !data.address || !data.shipping) {
    document.getElementById("order-output").innerHTML = "<p>Please fill in all fields.</p>";
    return;
  }
  try {
    const response = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
  });
    const result = await response.json();
    const output = document.getElementById("order-output");
    if (result.status == "success") {
      output.innerHTML = `
          <div class="success2">
            <p> Order placed sucessfully!</p>
            <p> Order ID: ${result.order_id}</p>
            <a href="/tracking/${result.order_id}" class="button">Track Your Order</a>
          </div>
        `;
    } else {
      output.innerHTML = `
        <div class="error">
          <p><strong>Error placing order:</strong></p>
          <ul>${result.errors.map(e => `<li>${e}</li>`).join("")}</ul>
        </div>
      `;
    } 
  } catch (err) {
    console.error("Error submitting order:", err);
    document.getElementById("order-output").innerHTML = "<p>Unexpected error. Please try again.</p>";
  }
}

document.getElementById("order-form").addEventListener("submit", submitOrder);