(function () {
	//////////////////////////////
	// 1) Site-level configuration
	//////////////////////////////
	const CONFIG = {
		SOURCE_TYPE: "mage",
		POLL_INTERVAL_MS: 500,
		MESSAGE_ROW_SELECTOR: "div.menu.hover\\:bg-base-300.rounded-md.group",
		FOCUS_INPUT_SELECTOR: "textarea, input[type='text'], [contenteditable='true']",
		DEFAULTS: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		}
	};

	//////////////////////////////
	// 2) Runtime state
	//////////////////////////////
	let settings = {};
	let isExtensionOn = true;
	let pollTimer = null;

	//////////////////////////////
	// 3) Generic utility helpers
	//////////////////////////////
	function escapeHtml(unsafe){
		try {
			if (!unsafe){ return ""; }
			if (settings.textonlymode){ return unsafe; }
			return (unsafe + "")
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/\"/g, "&quot;")
				.replace(/'/g, "&#039;");
		} catch(e){
			return "";
		}
	}

	//////////////////////////////
	// 4) Parsing logic
	//////////////////////////////
	function parseMessageRow(row){
		if (!row){ return null; }

		let name = "";
		let msg = "";
		let membership = "";

		try {
			const nameEle = row.querySelector("span.text-pink-500.font-medium.cursor-pointer");
			if (nameEle){
				name = escapeHtml((nameEle.textContent || "").trim());
			}
		} catch(e){}

		try {
			const msgCandidates = Array.from(row.querySelectorAll("div.d-flex.align-items-center span[style*='overflow-wrap']"))
				.map((ele)=> (ele.textContent || "").trim())
				.filter(Boolean);
			if (msgCandidates.length){
				// Mage prepends newest messages above older content; prefer first item, not last.
				msg = escapeHtml(msgCandidates[0]);
			}
		} catch(e){}

		try {
			const roleBadge = row.querySelector("div.d-flex.align-items-center > span.bg-pink-600");
			if (roleBadge){
				membership = escapeHtml((roleBadge.textContent || "").trim());
			}
		} catch(e){}

		if (!name || !msg){ return null; }

		return {
			data: {
				chatname: name,
				chatbadges: CONFIG.DEFAULTS.chatbadges,
				backgroundColor: CONFIG.DEFAULTS.backgroundColor,
				textColor: CONFIG.DEFAULTS.textColor,
				nameColor: "",
				chatmessage: msg,
				chatimg: "",
				hasDonation: CONFIG.DEFAULTS.hasDonation,
				membership: membership || CONFIG.DEFAULTS.membership,
				contentimg: CONFIG.DEFAULTS.contentimg,
				textonly: settings.textonlymode || false,
				type: CONFIG.SOURCE_TYPE
			}
		};
	}

	function processMessageRow(row){
		if (!row || !row.matches || !row.matches(CONFIG.MESSAGE_ROW_SELECTOR)){ return; }
		if (row.dataset.ssProcessed){ return; }

		const parsed = parseMessageRow(row);
		if (!parsed){ return; }

		row.dataset.ssProcessed = "true";
		pushMessage(parsed.data);
	}

	//////////////////////////////
	// 5) Bridge + command handling
	//////////////////////////////
	function pushMessage(data){
		try {
			chrome.runtime.sendMessage(chrome.runtime.id, { message: data }, function(){});
		} catch(e){}
	}

	function focusChatInput(){
		const input = document.querySelector(CONFIG.FOCUS_INPUT_SELECTOR);
		if (input && input.focus){
			input.focus();
			return true;
		}
		return false;
	}

	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
		try {
			if (request === "getSource") { sendResponse(CONFIG.SOURCE_TYPE); return; }
			if (request === "focusChat") { sendResponse(focusChatInput()); return; }
			if (request && typeof request === "object" && "settings" in request){
				settings = request.settings || {};
				sendResponse(true);
				return;
			}
			if (request && typeof request === "object" && "state" in request){
				isExtensionOn = !!request.state;
				sendResponse(true);
				return;
			}
		} catch(e){}
		sendResponse(false);
	});

	chrome.runtime.sendMessage(chrome.runtime.id, { getSettings: true }, function(response){
		if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) { return; }
		response = response || {};
		if (response.settings) { settings = response.settings; }
		if ("state" in response) { isExtensionOn = !!response.state; }
	});

	//////////////////////////////
	// 6) Polling bootstrap
	//////////////////////////////
	function scanMessages(){
		if (!isExtensionOn){ return; }
		try {
			document.querySelectorAll(CONFIG.MESSAGE_ROW_SELECTOR).forEach(processMessageRow);
		} catch(e){}
	}

	function startPolling(){
		clearInterval(pollTimer);
		pollTimer = setInterval(scanMessages, CONFIG.POLL_INTERVAL_MS);
	}

	console.log(`social stream injected (${CONFIG.SOURCE_TYPE})`);
	startPolling();
})();
