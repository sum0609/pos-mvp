export default function HeldOrdersScreen({ heldOrders, onResume }) {
  return (
    <div className="card">
      <h3>Held Orders</h3>
      <div className="simple-list">
        {!heldOrders.length && <div>No held orders.</div>}
        {heldOrders.map((order) => (
          <div key={order.id} className="held-row">
            <span>Order #{order.order_no} · {currency(order.grand_total)}</span>
            <button className="btn" onClick={() => onResume(order.id)}>Resume</button>
          </div>
        ))}
      </div>
    </div>
  );
}