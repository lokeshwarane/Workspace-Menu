// navigate/public/js/bread_crumb.js
// Replaces the generic workspace breadcrumb (e.g. "Projects") with the
// actual parent project name when viewing a Task linked to a Project.
// Targets Frappe v16 breadcrumb structure: ul.navbar-breadcrumbs

frappe.provide("navigate.breadcrumb");

navigate.breadcrumb = {
	/**
	 * Call this from task.js on refresh:
	 *
	 *   frappe.ui.form.on("Task", {
	 *       refresh(frm) {
	 *           navigate.breadcrumb.set_project_label(frm);
	 *       }
	 *   });
	 */
	set_project_label(frm) {
		const project = frm.doc.project;

		if (!project) {
			// No project linked on this Task — nothing to replace
			return;
		}

		// Wait for the breadcrumb DOM to render, then patch
		setTimeout(() => {
			navigate.breadcrumb._patch(project);
		}, 300);
	},

	_patch(project_name) {
		// Frappe v16 breadcrumb: ul.navbar-breadcrumbs > li > a.worksapce-breadcrumb
		// Note: "worksapce-breadcrumb" is Frappe's own typo — kept intentionally
		const $workspace_crumb = $("ul.navbar-breadcrumbs li a.worksapce-breadcrumb");

		if (!$workspace_crumb.length) {
			console.warn("[navigate.breadcrumb] Could not find workspace breadcrumb element.");
			return;
		}

		// Build the href to open the actual Project form
		const project_slug = encodeURIComponent(project_name);
		const href = `/desk/project/${project_slug}`;

		// Replace text and link
		$workspace_crumb
			.text(project_name)
			.attr("href", href)
			.attr("title", project_name);

		console.log(`[navigate.breadcrumb] Breadcrumb updated to: ${project_name}`);
	},
};