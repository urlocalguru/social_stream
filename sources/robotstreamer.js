(function () {
	//////////////////////////////
	// 1) Site-level configuration
	//////////////////////////////
	const CONFIG = {
		SOURCE_TYPE: "robotstreamer",
		POLL_INTERVAL_MS: 500,
		MESSAGE_ROW_SELECTOR: ".message",
		FOCUS_INPUT_SELECTOR: "#chatinput, #message, input[type='text'], textarea",
		// Unused for now; keep for future enhancements
		// AVATAR_SELECTOR: ".message-avatar img[src]",
		// BADGE_SELECTOR: ".message-icons img[src]",
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

	function getAllContentNodes(element) {
		let resp = "";
		if (!element){ return resp; }

		if (!element.childNodes || !element.childNodes.length){
			return element.textContent ? escapeHtml(element.textContent) : "";
		}

		element.childNodes.forEach(node => {
			if (node.childNodes && node.childNodes.length){
				resp += getAllContentNodes(node);
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim()){
				resp += escapeHtml(node.textContent);
			} else if (node.nodeType === 1){
				if (!settings.textonlymode){
					if (node.nodeName === "IMG" && node.src){
						node.src = node.src + "";
					}
					resp += node.outerHTML;
				} else if (node.nodeName === "BR"){
					resp += "\n";
				}
			}
		});

		return resp.trim();
	}

	//////////////////////////////
	// 4) Parsing logic
	//////////////////////////////
	function parseNameAndColor(row){
		let chatname = "";
		let nameColor = "";
		try {
			const nameEle = row.querySelector(".message-info-name");
			if (nameEle){
				chatname = escapeHtml((nameEle.textContent || "").trim());
				nameColor = nameEle.style.color || "";
			}
		} catch(e){}
		if (!chatname){ return null; }
		return { chatname, nameColor };
	}

	function extractLinesFromRow(row){
		const content = row.querySelector(".message-content");
		if (!content){ return null; }

		const lines = Array.from(content.querySelectorAll("span[title], span"))
			.map(node => (node.textContent || "").trim())
			.filter(Boolean);

		if (lines.length){
			return { mode: "lines", lines };
		}

		const full = getAllContentNodes(content).trim();
		if (!full){ return null; }
		return { mode: "full", full };
	}

	function buildBasePayload(chatname, nameColor){
		return {
			chatname,
			chatbadges: CONFIG.DEFAULTS.chatbadges,
			backgroundColor: CONFIG.DEFAULTS.backgroundColor,
			textColor: CONFIG.DEFAULTS.textColor,
			nameColor,
			chatimg: "", // unused for robotstreamer right now
			// chatimg: row.querySelector(CONFIG.AVATAR_SELECTOR)?.src || "",
			hasDonation: CONFIG.DEFAULTS.hasDonation,
			membership: CONFIG.DEFAULTS.membership,
			contentimg: CONFIG.DEFAULTS.contentimg,
			textonly: settings.textonlymode || false,
			type: CONFIG.SOURCE_TYPE
		};
	}

	function processMessageRow(row){
		if (!row || !row.matches || !row.matches(CONFIG.MESSAGE_ROW_SELECTOR)) { return; }

		const author = parseNameAndColor(row);
		if (!author){ return; }

		const parsed = extractLinesFromRow(row);
		if (!parsed){ return; }

		// RobotStreamer appends new lines to an existing row for the same user.
		if (parsed.mode === "lines"){
			let previousCount = parseInt(row.dataset.ssLineCount || "0", 10);
			if (!Number.isFinite(previousCount) || previousCount < 0){ previousCount = 0; }

			const newLines = previousCount > parsed.lines.length ? parsed.lines : parsed.lines.slice(previousCount);
			row.dataset.ssLineCount = String(parsed.lines.length);
			if (!newLines.length){ return; }

			newLines.forEach((line) => {
				if (!line){ return; }
				const data = buildBasePayload(author.chatname, author.nameColor);
				data.chatmessage = escapeHtml(line);
				pushMessage(data);
			});
			return;
		}

		// Fallback path when message isn't split into spans
		const previousFull = row.dataset.ssLastMessage || "";
		if (previousFull && previousFull === parsed.full){ return; }

		let outgoing = parsed.full;
		if (previousFull && parsed.full.startsWith(previousFull)){
			outgoing = parsed.full.slice(previousFull.length).replace(/^\s+/, "");
		}
		row.dataset.ssLastMessage = parsed.full;
		if (!outgoing){ return; }

		const data = buildBasePayload(author.chatname, author.nameColor);
		data.chatmessage = outgoing;
		pushMessage(data);
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
