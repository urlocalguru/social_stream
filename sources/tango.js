(function () {
	//////////////////////////////
	// 1) Site-level configuration
	//////////////////////////////
	const CONFIG = {
		SOURCE_TYPE: "tango",
		POLL_INTERVAL_MS: 500,
		MESSAGE_ROW_SELECTOR: "div.tzNgn > div.qv4zS.I8PsW[data-testid^='chat-event-']",
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
	const seenMessageKeys = new Set();

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

	function trimSeenSet(max=1500, keep=700){
		if (seenMessageKeys.size <= max){ return; }
		const reduced = Array.from(seenMessageKeys).slice(-keep);
		seenMessageKeys.clear();
		reduced.forEach((k)=>seenMessageKeys.add(k));
	}

	//////////////////////////////
	// 4) Parsing logic
	//////////////////////////////
	function parseMessageRow(row){
		if (!row){ return null; }

		let name = "";
		let msg = "";
		let chatimg = "";
		let membership = "";

		try {
			const nameEle = row.querySelector(".Hhi6n.P7wV2");
			if (nameEle){
				name = escapeHtml((nameEle.textContent || "").trim());
			}
		} catch(e){}

		try {
			const msgEle = row.querySelector(".KR99L > span");
			if (msgEle){
				msg = escapeHtml((msgEle.textContent || "").trim());
			}
		} catch(e){}

		try {
			const avatarEle = row.querySelector(".iE5Dk.gDmW2[data-lazybg]");
			if (avatarEle){
				chatimg = (avatarEle.getAttribute("data-lazybg") || "").trim();
			}
		} catch(e){}

		try {
			if (row.querySelector("[data-testid='avatar-vip-label']")){
				membership = "vip";
			}
		} catch(e){}

		if (!name || !msg){ return null; }

		const eventId = row.getAttribute("data-testid") || "";
		const dedupeKey = eventId || [name, msg, chatimg].join("::");
		return {
			dedupeKey,
			data: {
				chatname: name,
				chatbadges: CONFIG.DEFAULTS.chatbadges,
				backgroundColor: CONFIG.DEFAULTS.backgroundColor,
				textColor: CONFIG.DEFAULTS.textColor,
				nameColor: "",
				chatmessage: msg,
				chatimg,
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

		const parsed = parseMessageRow(row);
		if (!parsed){ return; }
		if (seenMessageKeys.has(parsed.dedupeKey)){ return; }

		seenMessageKeys.add(parsed.dedupeKey);
		trimSeenSet();
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
