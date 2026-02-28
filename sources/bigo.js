(function () {
	const SOURCE_TYPE = "bigo";

	function getAllContentNodes(element, helpers) {
		let resp = "";
		if (!element) { return resp; }

		if (!element.childNodes || !element.childNodes.length) {
			if (element.nodeType === 3) {
				return helpers.escapeHtml(element.textContent || "");
			}
		}

		element.childNodes.forEach(function (node) {
			if (node.childNodes && node.childNodes.length) {
				resp += getAllContentNodes(node, helpers);
			} else if (node.nodeType === 3 && node.textContent && node.textContent.trim().length > 0) {
				resp += helpers.escapeHtml(node.textContent);
			} else if (node.nodeType === 1 && !helpers.settings.textonlymode) {
				if (node.nodeName === "IMG" && node.src) { node.src = node.src + ""; }
				resp += node.outerHTML;
			}
		});
		return resp;
	}

	window.SocialStreamSourceCommon.createPollingSource({
		sourceType: SOURCE_TYPE,
		pollIntervalMs: 500,
		messageRowSelector: ".chat__container > *",
		focusInputSelector: "textarea",
		parseRow: function (row, helpers) {
			let name = "";
			let msg = "";
			try {
				const nameEle = row.querySelector(".user-name");
				if (nameEle) { name = helpers.escapeHtml((nameEle.textContent || "").trim()); }
			} catch (e) {}

			try {
				const msgEle = row.querySelector(".user-text-content");
				if (msgEle) { msg = getAllContentNodes(msgEle, helpers).trim(); }
			} catch (e) {}

			if (!name || !msg) { return null; }
			return {
				dedupeKey: [name, msg].join("::"),
				data: {
					chatname: name,
					chatbadges: "",
					backgroundColor: "",
					textColor: "",
					chatmessage: msg,
					chatimg: "",
					hasDonation: "",
					membership: "",
					contentimg: "",
					textonly: helpers.settings.textonlymode || false,
					type: SOURCE_TYPE
				}
			};
		}
	});
})();
