$("#submitFrom").on("click", async function () {
  let form = $("#contact-form");
  let obj = getDataFromForm(form);
  let result = await $.ajax({
    type: "POST",
    url: "/sendContact",
    data: obj,
  });
  if (!result.success) alert(result.error);
  alert("Message envoyé avec succès");
  $("#contact-form")
    .find("input,textarea, select")
    .each(function () {
      $(this).val("");
    });
});

function getDataFromForm($formSelector) {
  var obj = {};
  $formSelector.find("input, textarea, select").each(function () {
    if (!$(this).data("id")) return;
    if ($(this).is(":checkbox")) {
      obj[$(this).data("id")] = $(this).is(":checked") ? 1 : 0;
      return;
    }
    if ($(this).attr("type") === "combobox") {
      obj[$(this).data("id")] = $(this).find("option:selected").data("id");
      return;
    }
    obj[$(this).data("id")] = $(this).val();
  });
  return obj;
}
