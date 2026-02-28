(function () {
	const SOURCE_TYPE = "vaughn";

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

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "li.vs_chatv9_msg",
		focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
		defaults: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		},
		maxSeenMessages: 2000,
		keepSeenMessages: 1000,
		processRow: function (row, helpers) {
			let name = "";
			let chatimg = "";
			let membership = "";

			try {
				const nameEle = row.querySelector(".vs_chatv9_msg_username [vs-chatv9-color-01-username], .vs_chatv9_msg_username span");
				if (nameEle){
					name = helpers.escapeHtml((nameEle.textContent || "").trim());
				}
			} catch(e){}
			if (!name){ return; }

			try {
				const imgEle = row.querySelector(".vs_chatv9_msg_profile_photo img[src]");
				if (imgEle && imgEle.getAttribute("src")){
					chatimg = absolutizeUrl(imgEle.getAttribute("src"));
				}
			} catch(e){}

			try {
				const badges = Array.from(row.querySelectorAll(".vs_chatv9_msg_badge"))
					.map(function(ele){ return (ele.textContent || "").trim(); })
					.filter(Boolean);
				if (badges.length){
					membership = helpers.escapeHtml(badges.join(", "));
				}
			} catch(e){}

			const messageNodes = row.querySelectorAll(".vs_chatv9_msg_body[id], .vs_chatv9_msg_body_multi[id]");
			if (!messageNodes.length){ return; }

			messageNodes.forEach(function (node) {
				try {
					const messageId = (node.id || "").trim();
					const messageText = helpers.escapeHtml((node.textContent || "").trim());
					if (!messageId || !messageText){ return; }
					if (helpers.hasSeen(messageId)){ return; }
					helpers.rememberKey(messageId);
					helpers.pushMessage({
						chatname: name,
						chatbadges: helpers.config.defaults.chatbadges,
						backgroundColor: helpers.config.defaults.backgroundColor,
						textColor: helpers.config.defaults.textColor,
						nameColor: "",
						chatmessage: messageText,
						chatimg: chatimg,
						hasDonation: helpers.config.defaults.hasDonation,
						membership: membership || helpers.config.defaults.membership,
						contentimg: helpers.config.defaults.contentimg,
						textonly: helpers.settings.textonlymode || false,
						type: SOURCE_TYPE
					});
				} catch(e){}
			});
		}
	});
})();
