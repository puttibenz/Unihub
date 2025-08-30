// สำหรับ interaction เพิ่มเติม (อนาคต)
console.log("JS Loaded");

document.addEventListener("DOMContentLoaded", function() {
        const cards = document.querySelectorAll(".card");
        cards.forEach((card, index) => {
            const delay = 0.1 * index; // กำหนดหน่วงเวลา 0.1 วินาทีต่อการ์ด
            card.style.setProperty('--animation-delay', `${delay}s`);
        });
});
