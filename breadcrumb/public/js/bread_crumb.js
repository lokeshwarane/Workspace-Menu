// navigate/public/js/bread_crumb.js

frappe.provide("navigate.breadcrumb");

navigate.breadcrumb = {
    set_project_label(frm) {
        const project = frm.doc.project;
        if (!project) return;

        // Retry logic instead of a fixed timeout
        navigate.breadcrumb._try_patch(project, 0);
    },

    _try_patch(project_name, attempts) {
        if (attempts > 10) {
            console.warn("[navigate.breadcrumb] Gave up after 10 attempts.");
            return;
        }

        const $workspace_crumb = $("ul.navbar-breadcrumbs li a.worksapce-breadcrumb");

        if (!$workspace_crumb.length) {
            // Not rendered yet — retry after 200ms
            setTimeout(() => {
                navigate.breadcrumb._try_patch(project_name, attempts + 1);
            }, 200);
            return;
        }

        // Frappe uses hash routing: /app/project/Project%20Name
        const project_slug = encodeURIComponent(project_name);
        const href = `/app/project/${project_slug}`;

        $workspace_crumb
            .text(project_name)
            .attr("href", href)
            .attr("title", project_name);

        console.log(`[navigate.breadcrumb] Breadcrumb updated to: ${project_name}`);
    },
};