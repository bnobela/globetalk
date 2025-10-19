// Modal utility for chats.html
export function showModal({ title, content, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" }) {
  let modal = document.getElementById("flag-modal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "flag-modal";
  modal.style.position = "fixed";
  modal.style.top = 0;
  modal.style.left = 0;
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.3)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = 10000;
  modal.innerHTML = `
    <div style="background:#fff;padding:24px 20px;border-radius:10px;max-width:350px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,0.15);">
      <h2 style="margin-top:0;font-size:1.2em;">${title}</h2>
      <div style="margin-bottom:16px;">${content}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="flag-cancel-btn" style="padding:7px 18px;background:#e5e7eb;border:none;border-radius:5px;">${cancelText}</button>
        <button id="flag-confirm-btn" style="padding:7px 18px;background:#ef4444;color:#fff;border:none;border-radius:5px;">${confirmText}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("flag-cancel-btn").onclick = () => {
    modal.remove();
    if (onCancel) onCancel();
  };
  document.getElementById("flag-confirm-btn").onclick = () => {
    if (onConfirm) onConfirm();
    modal.remove();
  };
}
