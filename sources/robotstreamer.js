(function () {
	const SOURCE_TYPE = "robotstreamer";

	function getAllContentNodes(element, helpers) {
		let resp = "";
		if (!element){ return resp; }

		if (!element.childNodes || !element.childNodes.length){
			return element.textContent ? helpers.escapeHtml(element.textContent) : "";
		}

		element.childNodes.forEach(function (node) {
			if (node.childNodes && node.childNodes.length){
				resp += getAllContentNodes(node, helpers);
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim()){
				resp += helpers.escapeHtml(node.textContent);
			} else if (node.nodeType === 1){
				if (!helpers.settings.textonlymode){
					if (node.nodeName === "IMG" && node.src){ node.src = node.src + ""; }
					resp += node.outerHTML;
				} else if (node.nodeName === "BR"){
					resp += "\n";
				}
			}
		});

		return resp.trim();
	}

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: ".message",
		focusInputSelector: "#chatinput, #message, input[type='text'], textarea",
		defaults: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		},
		processRow: function (row, helpers) {
			let chatname = "";
			let nameColor = "";
			try {
				const nameEle = row.querySelector(".message-info-name");
				if (nameEle){
					chatname = helpers.escapeHtml((nameEle.textContent || "").trim());
					nameColor = nameEle.style.color || "";
				}
			} catch(e){}
			if (!chatname){ return; }

			const content = row.querySelector(".message-content");
			if (!content){ return; }

			const lineNodes = Array.from(content.querySelectorAll("span[title], span"));
			const lines = lineNodes.map(function (node) { return (node.textContent || "").trim(); }).filter(Boolean);

			const buildBasePayload = function () {
				return {
					chatname: chatname,
					chatbadges: helpers.config.defaults.chatbadges,
					backgroundColor: helpers.config.defaults.backgroundColor,
					textColor: helpers.config.defaults.textColor,
					nameColor: nameColor,
					chatimg: "",
					hasDonation: helpers.config.defaults.hasDonation,
					membership: helpers.config.defaults.membership,
					contentimg: helpers.config.defaults.contentimg,
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				};
			};

			if (lines.length){
				let previousCount = parseInt(row.dataset.ssLineCount || "0", 10);
				if (!Number.isFinite(previousCount) || previousCount < 0){ previousCount = 0; }

				const newLines = previousCount > lines.length ? lines : lines.slice(previousCount);
				row.dataset.ssLineCount = String(lines.length);
				if (!newLines.length){ return; }

				newLines.forEach(function (line) {
					if (!line){ return; }
					const dedupeKey = [chatname, line].join("::");
					if (helpers.hasSeen(dedupeKey)){ return; }
					helpers.rememberKey(dedupeKey);
					const data = buildBasePayload();
					data.chatmessage = helpers.escapeHtml(line);
					helpers.pushMessage(data);
				});
				return;
			}

			const full = getAllContentNodes(content, helpers).trim();
			if (!full){ return; }
			const previousFull = row.dataset.ssLastMessage || "";
			if (previousFull && previousFull === full){ return; }

			let outgoing = full;
			if (previousFull && full.startsWith(previousFull)){
				outgoing = full.slice(previousFull.length).replace(/^\s+/, "");
			}
			row.dataset.ssLastMessage = full;
			if (!outgoing){ return; }

			const dedupeKey = [chatname, outgoing].join("::");
			if (helpers.hasSeen(dedupeKey)){ return; }
			helpers.rememberKey(dedupeKey);
			const data = buildBasePayload();
			data.chatmessage = outgoing;
			helpers.pushMessage(data);
		}
	});
})();
