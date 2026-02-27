(function () {
	//////////////////////////////
	// 1) Site-level configuration
	//////////////////////////////
	const CONFIG = {
		SOURCE_TYPE: "vaughn",
		POLL_INTERVAL_MS: 500,
		MESSAGE_ROW_SELECTOR: "li.vs_chatv9_msg",
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

	function absolutizeUrl(url){
		if (!url){ return ""; }
		if (url.startsWith("//")){
			return window.location.protocol + url;
		}
		try {
			return new URL(url, window.location.origin).toString();
		} catch(e){
			return url + "";
		}
	}

	function trimSeenSet(max=2000, keep=1000){
		if (seenMessageKeys.size <= max){ return; }
		const reduced = Array.from(seenMessageKeys).slice(-keep);
		seenMessageKeys.clear();
		reduced.forEach((k)=>seenMessageKeys.add(k));
	}

	//////////////////////////////
	// 4) Parsing logic
	//////////////////////////////
	function getBaseRowInfo(row){
		let name = "";
		let chatimg = "";
		let membership = "";

		try {
			const nameEle = row.querySelector(".vs_chatv9_msg_username [vs-chatv9-color-01-username], .vs_chatv9_msg_username span");
			if (nameEle){
				name = escapeHtml((nameEle.textContent || "").trim());
			}
		} catch(e){}

		try {
			const imgEle = row.querySelector(".vs_chatv9_msg_profile_photo img[src]");
			if (imgEle && imgEle.getAttribute("src")){
				chatimg = absolutizeUrl(imgEle.getAttribute("src"));
			}
		} catch(e){}

		try {
			const badges = Array.from(row.querySelectorAll(".vs_chatv9_msg_badge"))
				.map((ele)=> (ele.textContent || "").trim())
				.filter(Boolean);
			if (badges.length){
				membership = escapeHtml(badges.join(", "));
			}
		} catch(e){}

		if (!name){ return null; }
		return { name, chatimg, membership };
	}

	function processMessageRow(row){
		if (!row || !row.matches || !row.matches(CONFIG.MESSAGE_ROW_SELECTOR)){ return; }

		const base = getBaseRowInfo(row);
		if (!base){ return; }

		const messageNodes = row.querySelectorAll(".vs_chatv9_msg_body[id], .vs_chatv9_msg_body_multi[id]");
		if (!messageNodes.length){ return; }

		messageNodes.forEach((node)=>{
			try {
				const messageId = (node.id || "").trim();
				const messageText = escapeHtml((node.textContent || "").trim());
				if (!messageId || !messageText){ return; }

				if (seenMessageKeys.has(messageId)){ return; }
				seenMessageKeys.add(messageId);
				trimSeenSet();

				const data = {
					chatname: base.name,
					chatbadges: CONFIG.DEFAULTS.chatbadges,
					backgroundColor: CONFIG.DEFAULTS.backgroundColor,
					textColor: CONFIG.DEFAULTS.textColor,
					nameColor: "",
					chatmessage: messageText,
					chatimg: base.chatimg,
					hasDonation: CONFIG.DEFAULTS.hasDonation,
					membership: base.membership || CONFIG.DEFAULTS.membership,
					contentimg: CONFIG.DEFAULTS.contentimg,
					textonly: settings.textonlymode || false,
					type: CONFIG.SOURCE_TYPE
				};

				pushMessage(data);
			} catch(e){}
		});
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
