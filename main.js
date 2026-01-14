const previewBox = document.getElementById("previewBox");
const addbtn = document.getElementById("addToChrome");
const gap = 30;

document.getElementById("nextBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const itemWidth = previewBox.querySelector("img").offsetWidth + gap;
    previewBox.scrollBy({ left: itemWidth, behavior: "smooth" });
});

document.getElementById("prevBtn").onclick = (e) => {
    e.preventDefault();
    const itemWidth = previewBox.querySelector("img").offsetWidth + gap;
    previewBox.scrollBy({ left: -itemWidth, behavior: "smooth" });
};

function dowloadExtension(url, filename) {
    const link = document.createElement('a');

    link.href = url;
    link.download = filename; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

addbtn.addEventListener("click", () => {
    dowloadExtension("GlowTabExtension.zip", 'GlowTabv1.zip');
});
