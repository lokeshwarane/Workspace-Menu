// navigate/public/js/task.js
// Hooks into the native ERPNext Task form to apply custom breadcrumb logic.

frappe.ui.form.on("Task", {
	refresh(frm) {
		navigate.breadcrumb.set_project_label(frm);
	},
});