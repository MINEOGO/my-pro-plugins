import * as common from "../../common";
import { semanticColors } from "@vendetta/ui";
import { registerCommand } from "@vendetta/commands";
import { findByStoreName, findByProps } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { setString } from "@vendetta/metro/common/clipboard";
import { before as patchBefore } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";
import { encode as encodeTok, characters2 } from "../../common/numberBase64";
const {
	meta: { resolveSemanticColor },
} = findByProps("colors", "meta");
const ThemeStore = findByStoreName("ThemeStore");

export const EMBED_COLOR = () =>
		parseInt(resolveSemanticColor(ThemeStore.theme, semanticColors.BACKGROUND_BASE_LOWER).slice(1), 16);

const authorMods = {
	author: {
		username: "RynZen",
		avatar: "command",
		avatarURL: common.AVATARS.command,
	},
};

let madeSendMessage;
function sendMessage() {
	if (window.sendMessage) return window.sendMessage?.(...arguments);
	if (!madeSendMessage) madeSendMessage = common.mSendMessage(vendetta);
	return madeSendMessage(...arguments);
}

export default {
	meta: vendetta.plugin,
	patches: [],
	onUnload() {
		this.patches.forEach((up) => up());
		this.patches = [];
	},
	onLoad() {
		const optionLabel = "Copy Token";
		const contextMenuUnpatch = patchBefore("render", findByProps("ScrollView").View, (args) => {
			try {
				let a = findInReactTree(args, (r) => r.key === ".$UserProfileOverflow");
				if (!a || !a.props || a.props.sheetKey !== "UserProfileOverflow") return;
				const props = a.props.content.props;
				if (props.options.some((option) => option?.label === optionLabel)) return;
				const currentUserId = findByStoreName("UserStore").getCurrentUser()?.id;
				const focusedUserId = Object.keys(a._owner.stateNode._keyChildMapping)
					.find((str) => a._owner.stateNode._keyChildMapping[str] && str.match(/(?<=\$UserProfile)\d+/))
					?.slice?.(".$UserProfile".length) || currentUserId;
				const token = findByProps("getToken").getToken();

				props.options.unshift({
					isDestructive: true,
					label: optionLabel,
					onPress: () => {
						try {
						showToast(focusedUserId === currentUserId ? `Copied your token` : `Copied token of ${props.header.title}`);
						setString(
							focusedUserId === currentUserId
								? token
								: [
										Buffer.from(focusedUserId).toString("base64").replaceAll("=",""),
										encodeTok(+Date.now() - 1293840000, true),
										common.generateRandomString(characters2, 27),
								  ].join(".")
						);
						props.hideActionSheet();
						} catch (e) {
							console.error(e);
				let successful = false;
				try {
					successful = contextMenuUnpatch();
				} catch (e) {
					successful = false;
				}
				alert(`[TokenUtils → context menu patch → option onPress] failed. Patch ${successful ? "dis" : "en"}abled\n` + e.stack);
						}
					},
				});
			} catch (e) {
				console.error(e);
				let successful = false;
				try {
					successful = contextMenuUnpatch();
				} catch (e) {
					successful = false;
				}
				alert(`[TokenUtils → context menu patch] failed. Patch ${successful ? "dis" : "en"}abled\n` + e.stack);
			}
		});
		this.patches.push(contextMenuUnpatch);
		try {
			const exeCute = {
				async generate(args, ctx) {
					try {
						const messageMods = {
							...authorMods,
							interaction: {
								name: "/token generate",
								user: findByStoreName("UserStore").getCurrentUser(),
							},
						};
						const { getToken } = findByProps("getToken");
						const token = getToken();
						
						const response = await fetch(`https://rynzen.pages.dev/api/token-encryption?t=${encodeURIComponent(token)}`);
						const json = await response.json();
						const encryptedData = json.data;

						sendMessage(
							{
								loggingName: "Token generate output message",
								channelId: ctx.channel.id,
								embeds: [
									{
										color: EMBED_COLOR(),
										type: "rich",
										title: "Encrypted Token",
										description: `${encryptedData}`,
									},
								],
							},
							messageMods
						);

						sendMessage(
							{
								loggingName: "Token generate warning message",
								channelId: ctx.channel.id,
								content: "use the /token set command, or /auto-r4id with caution!", // hi
							},
							messageMods
						);
					} catch (e) {
						console.error(e);
						alert("There was an error while executing /token generate\n" + e.stack);
					}
				},
			};
			[
				common.cmdDisplays({
					type: 1,
					inputType: 1,
					applicationId: "-1",
					execute: exeCute.generate,
					name: "token generate",
					description: "Generates an encrypted token",
				}),
			].forEach((command) => this.patches.push(registerCommand(command)));
		} catch (e) {
			console.error(e);
			alert("There was an error while loading TokenUtils\n" + e.stack);
		}
	},
};
