(function () {
  const form = document.querySelector(".wix-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const t = document.getElementById("geri-bildirim");
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
