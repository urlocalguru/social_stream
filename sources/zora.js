(function () {
	const SOURCE_TYPE = "zora";

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "div[class*='LiveStreamActivityComment_LiveStreamActivityComment']",
		focusInputSelector: "textarea, input[type='text'], [contenteditable='true']",
		defaults: {
			chatbadges: "",
			backgroundColor: "",
			textColor: "",
			hasDonation: "",
			membership: "",
			contentimg: ""
		},
		parseRow: function (row, helpers) {
			if (!row) { return null; }

			let name = "";
			let msg = "";
			let chatimg = "";

			try {
				const nameEle = row.querySelector("a[href^='/@']");
				if (nameEle){ name = helpers.escapeHtml((nameEle.textContent || "").trim()); }
			} catch(e){}

			try {
				const msgEle = row.querySelector("span[class*='Text_--weight-regular']") || row.querySelector("a[href^='/@'] + span");
				if (msgEle){ msg = helpers.escapeHtml((msgEle.textContent || "").trim()); }
			} catch(e){}

			try {
				const imgEle = row.querySelector("img[role='presentation'][src]");
				if (imgEle && imgEle.src){ chatimg = imgEle.src + ""; }
			} catch(e){}

			if (!name || !msg){ return null; }

			return {
				dedupeKey: [name, msg, chatimg].join("::"),
				data: {
					chatname: name,
					chatbadges: helpers.config.defaults.chatbadges,
					backgroundColor: helpers.config.defaults.backgroundColor,
					textColor: helpers.config.defaults.textColor,
					nameColor: "",
					chatmessage: msg,
					chatimg: chatimg,
					hasDonation: helpers.config.defaults.hasDonation,
					membership: helpers.config.defaults.membership,
					contentimg: helpers.config.defaults.contentimg,
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				}
			};
		}
	});
})();
