const updateShippingBtn = document.getElementById("updateShipping");
const cancelOrderBtn = document.getElementById("cancelOrder");
const cancelMessage = document.getElementById("time-remaining");
const orderId = cancelOrderBtn.getAttribute("data-order-id");
//const trackingStatus = document.querySelector("tracking-status");

if (cancelOrderBtn) {
    cancelOrderBtn.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/cancel_order", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: parseInt(orderId) })
            });

            if (response.status === 204) {
                cancelMessage.textContent = "Order cancelled successfully";
                //trackingStatus.textContent = "Your order was successfully cancelled and will not be processed or shipped";
                if (updateShippingBtn) updateShippingBtn.style.display = "none";
                cancelOrderBtn.style.display = "none";

                const statusEl = document.querySelector(".details p:nth-child(2)");
                if (statusEl) statusEl.innerHTML = "<strong>Status:</strong> Cancelled";
            } else if (response.status === 404) {
                cancelMessage.textContent = "Failed because the order cannot be found.";
            } else if (response.status === 400) {
                cancelMessage.textContent = "The order ID was invalid or the order cannot be cancelled.";
            } else {
                cancelMessage.textContent = "Unexpected error occurred.";
            }
        } catch (err) {
            console.error("Error:", err);
            cancelMessage.textContent = "Network error. Try again later.";
        }
    });
}
function updateShipping() {
    document.querySelector(".update-shipping").style.display = "block";
}

function cancelShipping() {
    document.querySelector(".update-shipping").style.display = "none";
}
function startCountdown() {
    const timerElement = document.getElementById("countdown");
    const timeContainer = document.getElementById("time-remaining");
    if (!timerElement || !timeContainer) return;

    const orderDateString = timeContainer.dataset.orderDate;
    const orderDate = new Date(orderDateString);
    const shipmentDelayMinutes = 3; 
    const shipmentTime = new Date(orderDate.getTime() + shipmentDelayMinutes * 60 * 1000);

    function updateCountdown() {
        const now = new Date();
        const remaining = shipmentTime - now;
        const statusElement = document.querySelector(".details p strong:nth-child(1)");
        const statusText = document.body.innerHTML.includes("Cancelled")
            ? "Cancelled"
            : document.body.innerHTML.includes("Shipped")
            ? "Shipped"
            : null;

        if (statusText === "Cancelled") {
            timerElement.textContent = "Order Cancelled";
            clearInterval(intervalId);
            updateShippingBtn.style.display = "none";
            cancelOrderBtn.style.display = "none";
            return;
        }
        if (statusText === "Shipped" || remaining <= 0) {
            timerElement.textContent = "Order Shipped";
            clearInterval(intervalId);
            updateShippingBtn.style.display = "none";
            cancelOrderBtn.style.display = "none";
            return;
        }
        const totalSeconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerElement.textContent = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    }
    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
}

window.addEventListener("DOMContentLoaded", startCountdown);
