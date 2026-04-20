frappe.inject_workspace_navbar = function () {
	$('.custom-workspace-navbar').remove();
	$('.custom-navbar-toggle').remove();
	$('.custom-navbar-slide-panel').remove();

	if (!$('.page-title').length) return;

	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Navbar items',
			fields: ['name', 'labele', 'linktype', 'linkto', 'url', 'child', 'icons', 'icon', 'icon_image'],
			order_by: 'creation asc',
			limit_page_length: 0,
		},
		callback: function (r) {
			if (!r.message) return;
			const navItems = r.message;

			const childFetches = navItems
				.filter(item => item.child)
				.map(item =>
					frappe.call({
						method: 'frappe.client.get',
						args: { doctype: 'Navbar items', name: item.name },
					}).then(res => {
						item._children = (res.message && res.message.add_navbar_field) || [];
					})
				);

			Promise.all(childFetches).then(() => _renderNavbar(navItems));
		},
	});
};

// Render icon HTML
function _renderIcon(icons, icon, icon_image) {
	if (icons === 'Upload icon' && icon_image) {
		return `<img src="${icon_image}" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;">`;
	} else if (icons === 'In-built frappe icon' && icon) {
		return frappe.utils.icon(icon, 'sm');
	}
	return '•';
}

// Safe slug — never crashes on null/undefined
function _slug(str) {
	if (!str) return '';
	return frappe.router.slug(str);
}

// Resolve any link type to its full href
function _resolveHref(linktype, linkto, url) {
	if (!linktype) return '#';
	if (linktype === 'URL') return url || '#';
	if (!linkto) return '#';
	switch (linktype) {
		case 'DocType':   return `/app/${_slug(linkto)}`;
		case 'Page':      return `/app/${_slug(linkto)}`;
		case 'Workspace': return `/app/${_slug(linkto)}`;
		case 'Dashboard': return `/app/dashboard-view/${encodeURIComponent(linkto)}`;
		case 'Report':    return `/app/query-report/${encodeURIComponent(linkto)}`;
		default:          return `/app/${_slug(linkto)}`;
	}
}

// Check if a resolved href matches the current page
function _isCurrentPage(href) {
	if (!href || href === '#') return false;
	const fullPath = window.location.pathname;
	try {
		const parsed = new URL(href);
		return fullPath.includes(parsed.pathname.replace('/app/', '').replace('/desk/', ''));
	} catch(e) {
		return fullPath.includes(href.replace('/app/', '').replace('/desk/', ''));
	}
}

function _renderNavbar(navItems) {
	const fullPath = window.location.pathname;

	function _extractPath(url) {
		if (!url) return null;
		try { return new URL(url).pathname; }
		catch (e) { return url; }
	}

	function _buildNavItemsHTML(prefix, forSlide) {
		prefix = prefix || '';
		let html = '';

		navItems.forEach(item => {
			if (item.child) {
				const children = item._children || [];
				const safeId   = item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
				const dropId   = `${prefix}navbar-btn-${safeId}`;
				const menuId   = `${prefix}navbar-menu-${safeId}`;
				const isActive = children.some(c => _isCurrentPage(_resolveHref(c.link_type, c.link, c.urll)));
				const iconHTML = _renderIcon(item.icons, item.icon, item.icon_image);
				const menuPos  = forSlide ? 'absolute' : 'fixed';

				const dropdownLinks = children.map(c => {
					const href          = _resolveHref(c.link_type, c.link, c.urll);
					const isChildActive = _isCurrentPage(href);
					const childIcon     = _renderIcon(c.icons, c.icon, c.icon_image);
					return `
						<a href="${href}" title="${c.label}"
						   style="display:flex;align-items:center;justify-content:center;
						          padding:7px 14px;text-decoration:none;
						          color:var(--text-color);"
						   onmouseover="this.style.background='var(--fg-color)'"
						   onmouseout="this.style.background='transparent'">
						   ${childIcon}
						</a>`;
				}).join('');

				html += `
					<div style="position:relative;display:inline-block;">
						<button id="${dropId}" title="${item.labele}"
						   style="display:flex;align-items:center;gap:4px;padding:5px 10px;
						          border-radius:6px;font-size:12px;font-weight:500;
						          cursor:pointer;white-space:nowrap;
						          border:0.5px solid transparent;
						          color:var(--text-color);
						          background:transparent;">
							${iconHTML}
							<span style="font-size:10px;">▾</span>
						</button>
						<div id="${menuId}"
						   style="display:none;position:${menuPos};z-index:9999;
						          top:100%;left:0;
						          background:var(--fg-color);
						          border:0.5px solid var(--border-color);border-radius:6px;
						          box-shadow:0 4px 12px rgba(0,0,0,0.1);min-width:56px;padding:4px 0;">
							${dropdownLinks}
						</div>
					</div>`;
			} else {
				const href     = _resolveHref(item.linktype, item.linkto, item.url);
				const isActive = item.linktype === 'URL'
					? (() => { const p = _extractPath(item.url); return p ? fullPath.includes(p.replace('/app/','').replace('/desk/','')) : false; })()
					: _isCurrentPage(href);
				const iconHTML = _renderIcon(item.icons, item.icon, item.icon_image);
				const width    = forSlide ? 'calc((100% - 54px) / 10)' : 'auto';

				html += `
					<a href="${href}" title="${item.labele}"
					   style="display:flex;align-items:center;justify-content:center;
					          padding:5px 10px;border-radius:6px;text-decoration:none;
					          white-space:nowrap;width:${width};
					          color:var(--text-color);
					          background:transparent;
					          border:0.5px solid transparent;"
					   onmouseover="this.style.background='var(--fg-color)'"
					   onmouseout="this.style.background='transparent'">
					   ${iconHTML}
					</a>`;
			}
		});

		return html;
	}

	function _bindDropdowns(prefix, forSlide) {
		prefix = prefix || '';
		$(`[id^="${prefix}navbar-btn-"]`).each(function () {
			const dropId = $(this).attr('id');
			const menuId = dropId.replace('-btn-', '-menu-');
			$(this).off('click').on('click', function (e) {
				e.stopPropagation();
				const $menu = $('#' + menuId);
				if (forSlide) {
					$menu.toggle();
				} else {
					const btn    = $(this);
					const offset = btn.offset();
					const height = btn.outerHeight();
					$menu.css({ top: offset.top + height, left: offset.left }).toggle();
				}
			});
		});
	}

	setTimeout(function () {
		const doesFit = navItems.length <= 10;

		if (doesFit) {
			$('.page-title').after(`
				<div class="custom-workspace-navbar"
				     style="display:flex;align-items:center;gap:4px;
				            overflow:visible;flex-wrap:nowrap;flex-shrink:0;">
					${_buildNavItemsHTML('', false)}
				</div>`);
			_bindDropdowns('', false);

		} else {
			$('body').append(`
				<div class="custom-navbar-slide-panel"
				     style="display:none;position:fixed;
				            width:600px;z-index:10000;
				            background:var(--fg-color);
				            box-shadow:0 8px 24px rgba(0,0,0,0.18);
				            border-radius:12px;
				            border:1px solid var(--border-color);
				            padding:12px 16px;
				            flex-wrap:wrap;gap:6px;
				            overflow:visible;">
					${_buildNavItemsHTML('slide-', true)}
				</div>`);

			$('.page-actions').before(`
				<button class="custom-navbar-toggle"
				   style="display:flex;align-items:center;justify-content:center;
				          padding:4px 8px;border-radius:6px;cursor:pointer;
				          border:1px solid var(--border-color);
				          background:var(--fg-color);
				          font-size:16px;line-height:1;
				          color:var(--text-color);margin-right:8px;">
					&#8964;
				</button>`);

			_bindDropdowns('slide-', true);

			let slideOpen = false;

			function openPanel() {
				const $panel  = $('.custom-navbar-slide-panel');
				const $btn    = $('.custom-navbar-toggle');
				const btnRect = $btn[0].getBoundingClientRect();
				const topPos  = btnRect.top;
				const leftPos = Math.max(8, btnRect.left - 608);

				$panel.css({
					top:       topPos + 'px',
					left:      leftPos + 'px',
					opacity:   '0',
					transform: 'translateY(-10px)',
					display:   'flex',
				});

				setTimeout(() => {
					$panel.css({
						transition: 'transform 0.3s ease, opacity 0.3s ease',
						transform:  'translateY(0)',
						opacity:    '1',
					});
				}, 20);

				$('.custom-navbar-toggle').html('&#8963;');
				slideOpen = true;
			}

			function closePanel() {
				const $panel = $('.custom-navbar-slide-panel');
				$panel.css({
					transition: 'transform 0.3s ease, opacity 0.3s ease',
					transform:  'translateY(-10px)',
					opacity:    '0',
				});
				setTimeout(() => {
					$panel.css({ display: 'none', transition: 'none' });
				}, 310);
				$('.custom-navbar-toggle').html('&#8964;');
				slideOpen = false;
			}

			$('.custom-navbar-toggle').off('click').on('click', function (e) {
				e.stopPropagation();
				slideOpen ? closePanel() : openPanel();
			});

			$(document).off('click.slide-panel').on('click.slide-panel', function (e) {
				if (slideOpen && !$(e.target).closest('.custom-navbar-slide-panel,.custom-navbar-toggle').length) {
					closePanel();
				}
			});
		}

		$(document).off('click.navbar-dropdowns').on('click.navbar-dropdowns', function () {
			$('[id^="navbar-menu-"]').hide();
			$('[id^="slide-navbar-menu-"]').hide();
		});

	}, 150);
}

// Boot
frappe.after_ajax(function () {
	frappe.inject_workspace_navbar();

	$(document).on('page-change', function () {
		setTimeout(() => frappe.inject_workspace_navbar(), 500);
	});
});

// Add ERPNext module icons to icon picker
$(document).on('mouseenter', '.icon-picker', function() {
	const icon_wrapper = $(this).find('.icons');
	if (icon_wrapper.find('.erpnext-icon-wrapper').length) return;

	const icons = [
		'taxes', 'support', 'subscription', 'subcontracting',
		'stock', 'selling', 'share_management', 'quality',
		'projects', 'payments', 'organization', 'manufacturing',
		'invoicing', 'financial_reports', 'erpnext_settings',
		'crm', 'buying', 'budget', 'banking', 'assets', 'accounts_setup'
	];

	icons.forEach(icon => {
		const $icon = $(`
			<div id="erpnext-${icon}" class="icon-wrapper erpnext-icon-wrapper" title="${icon}">
				<img src="/assets/erpnext/icons/desktop_icons/solid/${icon}.svg"
				     style="width:18px;height:18px;">
			</div>
		`);
		icon_wrapper.prepend($icon);
	});
});