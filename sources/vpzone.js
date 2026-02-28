(function () {
	const SOURCE_TYPE = "vpzone";

	function absolutizeUrl(url){
		if (!url){ return ""; }
		try {
			return new URL(url, window.location.origin).toString();
		} catch(e){
			return url + "";
		}
	}

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: "div.flex.items-start.gap-2.py-1.hover\\:bg-bg-tertiary\\/50.px-1.rounded.transition-colors.animate-slide-in",
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
			let timeText = "";

			try {
				const nameEle = row.querySelector("span.font-semibold.text-accent-purple");
				if (nameEle){ name = helpers.escapeHtml((nameEle.textContent || "").trim()); }
			} catch(e){}

			try {
				const msgEle = row.querySelector("p.text-text-primary.text-sm.leading-snug.break-words");
				if (msgEle){ msg = helpers.escapeHtml((msgEle.textContent || "").trim()); }
			} catch(e){}

			try {
				const imgEle = row.querySelector("img.rounded-full[src]");
				if (imgEle && imgEle.src){ chatimg = absolutizeUrl(imgEle.getAttribute("src") || imgEle.src); }
			} catch(e){}

			try {
				const timeCandidates = row.querySelectorAll("span.text-text-tertiary.text-\\[10px\\]");
				if (timeCandidates.length){ timeText = (timeCandidates[timeCandidates.length - 1].textContent || "").trim(); }
			} catch(e){}

			if (!name || !msg){ return null; }

			return {
				dedupeKey: [name, msg, timeText, chatimg].join("::"),
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
