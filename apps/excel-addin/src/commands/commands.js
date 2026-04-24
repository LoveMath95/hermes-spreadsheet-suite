/* global Office */

async function openTaskPaneWithPrefill(prefill) {
  Office.context.document.settings.set("hermesPrefillPrompt", prefill);
  await new Promise((resolve) => Office.context.document.settings.saveAsync(() => resolve()));

  if (Office.addin?.showAsTaskpane) {
    await Office.addin.showAsTaskpane();
  }
}

function complete(event) {
  if (event && typeof event.completed === "function") {
    event.completed();
  }
}

export async function explainSelection(event) {
  await openTaskPaneWithPrefill("Explain the current selection.");
  complete(event);
}

export async function generateFormula(event) {
  await openTaskPaneWithPrefill("Suggest a formula for the current selection.");
  complete(event);
}

export async function insertFromImage(event) {
  await openTaskPaneWithPrefill("Extract the attached table image and prepare an insert preview.");
  complete(event);
}

Office.onReady(() => {
  Office.actions.associate("explainSelection", explainSelection);
  Office.actions.associate("generateFormula", generateFormula);
  Office.actions.associate("insertFromImage", insertFromImage);
});
