// Track last clicked URL item name
let _activeUrlItem = null;

frappe.inject_workspace_navbar = function () {
	$('.custom-workspace-navbar').remove();
	$('.custom-menu-btn').remove();
	$('.page-head').css('overflow', 'visible');
	$('.page-head-content').css('overflow', 'visible');

	if (!$('.page-title').length) return;

	frappe.call({
		method: 'frappe.client.get_list',
		args: {
			doctype: 'Navbar items',
			fields: ['name', 'labele', 'linktype', 'linkto', 'url', 'child'],
			order_by: 'creation asc',
			limit: 100,
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

// Resolve any link type to its full href
function _resolveHref(linktype, linkto, url) {
	if (!linktype) return '#';
	if (linktype === 'URL') return url || '#';
	if (!linkto) return '#';
	switch (linktype) {
		case 'DocType':   return `/app/${frappe.router.slug(linkto)}`;
		case 'Page':      return `/app/${frappe.router.slug(linkto)}`;
		case 'Workspace': return `/app/${frappe.router.slug(linkto)}`;
		case 'Dashboard': return `/app/dashboard-view/${encodeURIComponent(linkto)}`;
		case 'Report':    return `/app/query-report/${encodeURIComponent(linkto)}`;
		default:          return `/app/${frappe.router.slug(linkto)}`;
	}
}

// Check if a resolved href matches the current page
function _isCurrentPage(href) {
	if (!href || href === '#') return false;
	const fullPath = window.location.pathname;
	if (href.startsWith('http://') || href.startsWith('https://')) return false;
	return fullPath.includes(href.replace('/app/', ''));
}

function _renderNavbar(navItems) {
	const fullPath = window.location.pathname;

	// Check if current page belongs to any navbar item
	function isNavbarPage() {
		return navItems.some(item => {
			if (item.child) {
				return (item._children || []).some(c => {
					if (c.link_type === 'URL') {
						// Match internal URL against current path
						const url = c.urll || '';
						if (!url || url.startsWith('http://') || url.startsWith('https://')) return false;
						return fullPath.includes(url.replace('/app/', ''));
					}
					return _isCurrentPage(_resolveHref(c.link_type, c.link, c.urll));
				});
			} else {
				if (item.linktype === 'URL') {
					// Match internal URL against current path
					const url = item.url || '';
					if (!url || url.startsWith('http://') || url.startsWith('https://')) return false;
					return fullPath.includes(url.replace('/app/', ''));
				}
				return _isCurrentPage(_resolveHref(item.linktype, item.linkto, item.url));
			}
		});
	}

	const isWorkspacePage = isNavbarPage();

	// Build dropdown groups (child = 1 items)
	let dropdownGroupsHTML = '';

	navItems.filter(item => item.child).forEach(item => {
		const children = item._children || [];
		const safeId   = item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
		const dropId   = `navbar-btn-${safeId}`;
		const menuId   = `navbar-menu-${safeId}`;

		const isActive = children.some(c => {
			const href = _resolveHref(c.link_type, c.link, c.urll);
			// For URL type, highlight based on last clicked
			if (c.link_type === 'URL') return _activeUrlItem === c.name;
			return _isCurrentPage(href);
		});

		const dropdownLinks = children.map(c => {
			const href = _resolveHref(c.link_type, c.link, c.urll);
			const isChildActive = c.link_type === 'URL'
				? _activeUrlItem === c.name
				: _isCurrentPage(href);
			return `
				<a href="${href}"
				   data-item-name="${c.name}"
				   data-is-url="${c.link_type === 'URL' ? '1' : '0'}"
				   style="display:block;padding:7px 14px;font-size:12px;font-weight:500;
				          text-decoration:none;
				          color:${isChildActive ? '#5c6ac4' : 'var(--text-color)'};
				          white-space:nowrap;font-weight:${isChildActive ? '700' : '500'};"
				   onmouseover="this.style.background='var(--fg-color)'"
				   onmouseout="this.style.background='transparent'">
				   ${c.label}
				</a>`;
		}).join('');

		dropdownGroupsHTML += `
			<div style="position:relative;display:inline-block;">
				<button id="${dropId}"
				   style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;
				          cursor:pointer;white-space:nowrap;
				          border:0.5px solid ${isActive ? '#5c6ac4' : 'transparent'};
				          color:${isActive ? '#fff' : 'var(--text-color)'};
				          background:${isActive ? '#5c6ac4' : 'transparent'};">
					${item.labele} ▾
				</button>
				<div id="${menuId}"
				   style="display:none;position:fixed;z-index:9999;background:var(--fg-color);
				          border:0.5px solid var(--border-color);border-radius:6px;
				          box-shadow:0 4px 12px rgba(0,0,0,0.1);min-width:160px;padding:4px 0;">
					${dropdownLinks}
				</div>
			</div>`;
	});

	// Build plain tabs (child = 0)
	const tabs = navItems.filter(item => !item.child).map(item => {
		const href = _resolveHref(item.linktype, item.linkto, item.url);
		// For URL type, highlight based on last clicked
		const isActive = item.linktype === 'URL'
			? _activeUrlItem === item.name
			: _isCurrentPage(href);
		return `
			<a href="${href}"
			   data-item-name="${item.name}"
			   data-is-url="${item.linktype === 'URL' ? '1' : '0'}"
			   style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;
			          text-decoration:none;white-space:nowrap;
			          color:${isActive ? '#fff' : 'var(--text-color)'};
			          background:${isActive ? '#5c6ac4' : 'transparent'};
			          border:0.5px solid ${isActive ? '#5c6ac4' : 'transparent'};"
			   onmouseover="this.style.background='${isActive ? '#5c6ac4' : 'var(--fg-color)'}';this.style.color='${isActive ? '#fff' : 'var(--text-color)'}'"
			   onmouseout="this.style.background='${isActive ? '#5c6ac4' : 'transparent'}';this.style.color='${isActive ? '#fff' : 'var(--text-color)'}'"
			>${item.labele}</a>`;
	}).join('');

	// Navbar HTML
	const navbarHTML = `
		<div class="custom-workspace-navbar"
		     style="display:flex;align-items:center;gap:4px;padding:6px 16px;
		            background:var(--navbar-bg);border-bottom:1px solid var(--border-color);overflow:visible;">
			${dropdownGroupsHTML}
			${tabs}
		</div>`;

	// Bind dropdown toggles + URL click tracking
	function bindDropdowns() {
		navItems.filter(i => i.child).forEach(item => {
			const safeId = item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
			const dropId = `navbar-btn-${safeId}`;
			const menuId = `navbar-menu-${safeId}`;

			$('#' + dropId).off('click').on('click', function (e) {
				e.stopPropagation();
				const btn    = $(this);
				const offset = btn.offset();
				const height = btn.outerHeight();
				$('#' + menuId).css({ top: offset.top + height, left: offset.left }).toggle();
			});
		});

		// Track clicks on URL type items to highlight them
		$('.custom-workspace-navbar a[data-is-url="1"]').off('click.urltrack').on('click.urltrack', function () {
			_activeUrlItem = $(this).data('item-name');
		});
		$('.custom-workspace-navbar a[data-is-url="0"]').off('click.urltrack').on('click.urltrack', function () {
			_activeUrlItem = null;
		});
	}

	$(document).off('click.navbar-dropdowns').on('click.navbar-dropdowns', function () {
		$('[id^="navbar-menu-"]').hide();
	});

	if (isWorkspacePage) {
		$('.page-title').after(navbarHTML);
		bindDropdowns();

		$(document).on('click.accounting-dropdown', function () {
			$('[id^="navbar-menu-"]').hide();
		});

	} else {
		const menuBtn = $(`
			<button class="custom-menu-btn"
			   style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:500;
			          cursor:pointer;white-space:nowrap;border:0.5px solid var(--border-color);
			          color:var(--text-color);background:transparent;margin-right:8px;">
				☰ Menu
			</button>`);

		if ($('.page-actions').length) {
			$('.page-actions').prepend(menuBtn);
		}

		const navbar = $(navbarHTML).css({
			position: 'fixed', top: '0', left: '0', right: '0',
			'z-index': '9998', 'box-shadow': '0 4px 16px rgba(0,0,0,0.2)',
		}).hide();
		$('body').append(navbar);

		menuBtn.on('click', function (e) {
			e.stopPropagation();
			navbar.slideToggle(200);
			bindDropdowns();
		});

		$(document).on('click.custom-menu', function (e) {
			if (!$(e.target).closest('.custom-workspace-navbar, .custom-menu-btn').length) {
				navbar.slideUp(200);
				$('[id^="navbar-menu-"]').hide();
			}
		});
	}
}

// Boot
frappe.after_ajax(function () {
	frappe.inject_workspace_navbar();

	$(document).on('page-change', function () {
		setTimeout(() => frappe.inject_workspace_navbar(), 500);
	});
});