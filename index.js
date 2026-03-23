const { Client, GatewayIntentBits, REST, Routes, ActivityType, PermissionFlagsBits, ApplicationCommandOptionType, PermissionsBitField, AttachmentBuilder, EmbedBuilder, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, } = require("discord.js");
const fs = require('fs');
const dotenv = require("dotenv");
const SampQuery = require("samp-query");
const Canvas = require('canvas');
const { createCanvas, loadImage, registerFont } = require('canvas');
require('dotenv').config();
const path = require("path");
const moment = require('moment-timezone');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

dotenv.config();

// Initialize chart
const width = 800;
const height = 400;
const chartCallback = (ChartJS) => {
    ChartJS.defaults.color = '#ffffff';
    ChartJS.defaults.font.family = 'Arial';
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

// Store player count history
const playerHistory = [];
const maxDataPoints = 30; // Keep last 5 minutes of data (30 points * 10 seconds)

// Setup bot client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // For member add event
    ],
    partials: [Partials.Channel]
});

// Register the slash commands
const commands = [
    {
        name: "announce",
        description: "Create an announcement in the target channel",
        options: [
            {
                name: "channel",
                description: "Select the target channel",
                type: ApplicationCommandOptionType.Channel,
                required: true,
            },
            {
                name: "message",
                description: "The message you want to announce",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: "image",
                description: "Attach an image to the announcement (optional)",
                type: ApplicationCommandOptionType.Attachment,
                required: false,
            }
        ],
    },
    {
        name: "applyforvisa",
        description: "Receive a link to apply for a visa in your DMs",
    },
    {
        name: "ar",
        description: "Add a role to a user",
        options: [
            {
                name: "user",
                description: "Select a user",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "role",
                description: "Select a role",
                type: ApplicationCommandOptionType.Role,
                required: true,
            },
        ],
    },
    {
        name: "rr",
        description: "Remove a role from a user",
        options: [
            {
                name: "user",
                description: "Select a user",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "role",
                description: "Select a role",
                type: ApplicationCommandOptionType.Role,
                required: true,
            },
        ],
    },
    {
        name: "vrpoll",
        description: "Create a poll for users to vote",
        options: [
            {
                name: "question",
                description: "The poll question",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
        name: "changenick",
        description: "Change a user's nickname to 'ATRP┆<name>'",
        options: [
            {
                name: "user",
                description: "Select a user to change their nickname",
                type: ApplicationCommandOptionType.User,
                required: true,
            },
            {
                name: "nickname",
                description: "Enter the new nickname",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },
    {
      name: "givevisa",
      description: "Give a visa to a player (Moderator only)",
      options: [
        {
            name: "user",
            description: "Select the user to give the visa to",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "character",
            description: "Enter the character name",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
      ],
    },
    {
        name: "startvp",
        description: "Announce that a Voice Process has started",
    },
    {
        name: "endvp",
        description: "Announce that a Voice Process has ended",
    }
];

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    client.user.setPresence({
        activities: [{ name: "VRPxATRP Data", type: ActivityType.Watching }],
        status: "online"
    });

    // Start the player count update loop
    const PLAYER_COUNT_CHANNEL = '1140660775262884000'; // Replace with your channel ID
    updatePlayerCount(PLAYER_COUNT_CHANNEL);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log("✅ Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error("❌ Error registering slash commands:", error);
    }
});

// New member welcome handler
 client.on('guildMemberAdd', async (member) => {
    try {
        const canvas = Canvas.createCanvas(2000, 647);
        const ctx = canvas.getContext('2d');

        const background = await Canvas.loadImage('./welcome.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        const joinDate = new Date();
        const formattedDate = joinDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        const formattedTime = joinDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

        ctx.textAlign = 'center';

        ctx.fillStyle = '#d90166'; // Pink
        ctx.font = '30px Arial';
        ctx.fillText(`${member.user.username}`, 1180, 255);

        ctx.fillStyle = '#ffffff'; // White
        ctx.font = 'bold 25px Arial';
        ctx.fillText(`${formattedDate}`, 135, 260);
        ctx.fillText(`${formattedDate}`, 1050, 410);

        ctx.fillText(`${formattedTime}`, 323, 260);
        ctx.fillText(`${formattedTime}`, 1280, 410);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });

        const channelId = '1353070591145414758'; // Replace with your welcome channel ID
        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) return;

        const welcomeMessage = `✨ 𝐇𝐄𝐋𝐋𝐎 <@${member.id}> 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐕𝐈𝐍𝐓𝐀𝐆𝐄 𝐑𝐎𝐋𝐄𝐏𝐋𝐀𝐘 ✨\n\n` +
            `ᴋɪɴᴅʟʏ ʀᴇᴀᴅ ᴛʜᴇ ʀᴘ ʀᴜʟᴇs ᴀᴛ : <#1338511667041931335>\n` +
            `ᴋɪɴᴅʟʏ ʀᴇᴀᴅ ᴛʜᴇ ᴅɪsᴄᴏʀᴅ ʀᴜʟᴇs ᴀᴛ : <#848155822797488189>\n` +
            `ᴀᴘᴘʟʏ ғᴏʀ ᴠɪsᴀ ᴀᴛ : <#1335093324171710524>\n` +
            `👏 𝐓𝐇𝐀𝐍𝐊𝐒 𝐅𝐎𝐑 𝐉𝐎𝐈𝐍𝐈𝐍𝐆 𝐎𝐔𝐑 𝐒𝐄𝐑𝐕𝐄𝐑 𝐘𝐎𝐔'𝐑𝐄 𝐍𝐎𝐖 ${member.guild.memberCount} 𝐌𝐄𝐌𝐁𝐄𝐑 𝐁𝐑𝐎 👏`;

        await channel.send({
            content: welcomeMessage,
            files: [attachment]
        });
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName, options } = interaction;

    await interaction.deferReply();

    const allowedRoles = ["1484536118979461262"];
    const memberRoles = interaction.member.roles.cache.map(role => role.id);

    if ((commandName === "ar" || commandName === "rr") &&
        !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !memberRoles.some(role => allowedRoles.includes(role))) {
        return interaction.editReply({ content: "❌ You don't have permission to use this command.", flags: 64 });
    }

    if (commandName === "ar") {
        const user = options.getUser("user");
        const role = options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        if (member.roles.cache.has(role.id)) {
            return interaction.editReply({ content: `❌ <@${user.id}> already has the <@&${role.id}> role.` });
        }

        await member.roles.add(role);
        await interaction.editReply({ content: `✅ The role <@&${role.id}> has been added to <@${user.id}>.` });
    }

    if (commandName === "rr") {
        const user = options.getUser("user");
        const role = options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        if (!member.roles.cache.has(role.id)) {
            return interaction.editReply({ content: `❌ <@${user.id}> doesn't have the <@&${role.id}> role.` });
        }

        await member.roles.remove(role);
        await interaction.editReply({ content: `✅ The role <@&${role.id}> has been removed from <@${user.id}>.` });
    }

    if (commandName === "announce") {
        const channel = options.getChannel("channel");
        const message = options.getString("message");
        const attachment = options.getAttachment("image");

        if (!channel.isTextBased()) {
            return interaction.editReply({ content: "❌ Please select a valid text channel.", flags: 64 });
        }

        if (attachment) {
            await channel.send({ content: message, files: [attachment.url] });
        } else {
            await channel.send(message);
        }

        await interaction.editReply({ content: "✅ Announcement sent!", flags: 64 });
    }

    if (commandName === "vrpoll") {
        const question = options.getString("question");
        const pollMessage = await interaction.editReply({ content: `**Poll:** ${question}`, fetchReply: true });
        await pollMessage.react("✅");
        await pollMessage.react("❌");
    }

    if (commandName === "applyforvisa") {
        const visaLink = process.env.VISA_LINK;

        try {
            await interaction.user.send(`Here is the link to apply for a visa: ${visaLink}`);
            await interaction.editReply({ content: "I've sent you a DM with the visa application link!", flags: 64 });
        } catch (error) {
            if (error.code === 50007) {
                await interaction.editReply({
                    content: "❌ I couldn't DM you! Please enable DMs from server members in your privacy settings.",
                    flags: 64
                });
            } else {
                console.error("❌ Error sending DM: ", error);
                await interaction.editReply({
                    content: "❌ There was an error sending the link. Please try again later.",
                    flags: 64
                });
            }
        }
    }

if (commandName === "changenick") {
        const allowedRole = "1484536118979461262"; // Replace with the specific allowed role ID
        const memberRoles = interaction.member.roles.cache.map(role => role.id);

        if (!memberRoles.includes(allowedRole)) {
            return interaction.editReply({
                content: "❌ You do not have permission to use this command.",
                flags: 64,
            });
        }

        const user = options.getUser("user");
        const nicknameInput = options.getString("nickname");
        const member = await interaction.guild.members.fetch(user.id);

        const newNickname = `VRP┆${nicknameInput}`;

        try {
            await member.setNickname(newNickname);
            await interaction.editReply({
                content: `✅ Nickname for <@${user.id}> changed to **${newNickname}**.`,
            });
        } catch (error) {
            console.error("❌ Failed to change nickname:", error);
            await interaction.editReply({
                content: "❌ Failed to change nickname. Make sure my role is above the user's role and I have permission.",
            });
        }
    }
    if (commandName === "startvp") {
        // Check for allowed role (Admin or specific role)
        const allowedRole = "1484536118979461262"; // Admin/Mod role ID
        const allowedChannel = "1350128634169655317"; // Command channel ID
        
        if (!interaction.member.roles.cache.has(allowedRole)) {
            return interaction.editReply({ 
                content: "❌ You don't have permission to use this command.", 
                ephemeral: true 
            });
        }

        if (interaction.channelId !== allowedChannel) {
            return interaction.editReply({ 
                content: "⚠️ This command can only be used in the authorized channel.", 
                ephemeral: true 
            });
        }

        const gifAttachment = new AttachmentBuilder("./assets/startvp.gif");

        const embed = new EmbedBuilder()
            .setColor("#00FF9C")
            .setTitle("🎤 Voice Process Started!")
            .setDescription("The **Voice Process** has started! Please read the rules carefully and join the **waiting hall**. 🎧")
            .setImage("attachment://startvp.gif")
            .setFooter({ text: `Started by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // You can modify this channel ID to match your desired output channel
        const outputChannel = await interaction.guild.channels.fetch("1298883949535428618");
        if (!outputChannel) {
            return interaction.editReply({ content: "❌ Output channel not found!", ephemeral: true });
        }

        await outputChannel.send({
            content: `<@&1429439830667956244> <@&1430475636769685505>`, // Tagging both roles (Civilian & Visa Accepted)
            embeds: [embed],
            files: [gifAttachment],
        });

        await interaction.editReply({ content: "✅ Voice Process Start message sent!", ephemeral: true });
    }

    if (commandName === "endvp") {
        // Check for allowed role (Admin or specific role)
        const allowedRole = "1484536118979461262"; // Admin/Mod role ID
        const allowedChannel = "1350128634169655317"; // Command channel ID
        
        if (!interaction.member.roles.cache.has(allowedRole)) {
            return interaction.editReply({ 
                content: "❌ You don't have permission to use this command.", 
                ephemeral: true 
            });
        }

        if (interaction.channelId !== allowedChannel) {
            return interaction.editReply({ 
                content: "⚠️ This command can only be used in the authorized channel.", 
                ephemeral: true 
            });
        }

        const gifAttachment = new AttachmentBuilder("./assets/endvp.gif");

        const embed = new EmbedBuilder()
            .setColor("#FF5757")
            .setTitle("📢 Voice Process Ended!")
            .setDescription("The **Voice Process** has ended. Thank you for attending — join next time! 🕒")
            .setImage("attachment://endvp.gif")
            .setFooter({ text: `Ended by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // You can modify this channel ID to match your desired output channel
        const outputChannel = await interaction.guild.channels.fetch("1298883949535428618");
        if (!outputChannel) {
            return interaction.editReply({ content: "❌ Output channel not found!", ephemeral: true });
        }

        await outputChannel.send({
            content: `<@&1429439830667956244> <@&1430475636769685505>`, // Tagging both roles (Civilian & Visa Accepted)
            embeds: [embed],
            files: [gifAttachment],
        });

        await interaction.editReply({ content: "✅ Voice Process End message sent!", ephemeral: true });
    }

    if (commandName === "givevisa") {
    const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
    const MOD_ROLE_ID = "1484536118979461262"; // Moderator role
    const ROLE_TO_REMOVE = "1429439830667956244"; // Role to remove civilan role
    const ROLE_TO_ADD1 = "1429439829657255976"; // Role to add1 verify
    const ROLE_TO_ADD = "1429439823831109753"; // Role to add visa holder
    const VISA_TEMPLATE = path.join(__dirname, "assets/passport.png");
    const PASSPORT_FILE = path.join(__dirname, "data/passport.json");
    const OUTPUT_CHANNEL_ID = "1429440031407345736"; // Public channel
    const NICKNAME_PREFIX = "VRP";

    // Check moderator role
    if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
        return interaction.editReply({ content: "❌ You do not have permission to use this command." });
    }

    const fs = require("fs");
    function getNextPassportId() {
        if (!fs.existsSync(PASSPORT_FILE)) fs.writeFileSync(PASSPORT_FILE, JSON.stringify({ last: 0 }));
        const data = JSON.parse(fs.readFileSync(PASSPORT_FILE));
        data.last += 1;
        fs.writeFileSync(PASSPORT_FILE, JSON.stringify(data));
        return String(data.last).padStart(6, "0");
    }

    const user = options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id);
    const charName = options.getString("character");
    const passportId = getNextPassportId();
    const dateOfEntry = new Date().toLocaleDateString("en-GB");
    const issuedBy = interaction.member.user.username;

    // Canvas visa image
    const template = await Canvas.loadImage(VISA_TEMPLATE);
    const canvas = Canvas.createCanvas(531, 354);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    const avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.save();
    ctx.beginPath();
    ctx.rect(35, 50, 161, 169)
    ctx.clip();
    ctx.drawImage(avatar, 35, 50, 161, 169);
    ctx.restore();

    
    ctx.font = "bold 20px 'times new roman'";
    ctx.fillStyle = "#022135";
    ctx.fillText(charName, 264, 84);
    ctx.fillText(passportId, 308, 109);
    ctx.fillText(dateOfEntry, 328, 131);
    ctx.fillText(issuedBy, 295, 204);
    ctx.font = "20px 'times new roman'";
    //ctx.fillText("Visa Validity: TILL NEXT PHASE", 310, 520);
    //ctx.fillText("No Of Entries: SINGLE", 310, 550);

    
   // ✅ Create Embed Message
const visaEmbed = new EmbedBuilder()
    .setColor("#10b981") // Green color
    .setTitle(`🎉 Visa Accepted — Congratulations, ${charName}!`) // use manual character name
    .setDescription(
        `Your visa application has been approved. Welcome to the community!\n\n` +
        `**What to do next:** Join the server using the IP below and read the rules in <#1429440001250427012>.\n` +
        `**Server IP:** <#1429440047324860446>\n` +
        `If you need help, tag admins in <#846750736946954264>. ✅`
    )
    .addFields(
        { name: "Issued By", value: `<@${interaction.member.user.id}>`, inline: true },
    )
    .setImage(`attachment://visa_${user.id}.png`) // ✅ must match the attached file name below
    .setFooter({ text: "VGS RP Visa System" })
    .setTimestamp();

  // ✅ Create image attachment (file name must match embed reference)
  const attachment = new AttachmentBuilder(await canvas.toBuffer("image/png"), {
    name: `visa_${user.id}.png`,
});

// ✅ Send publicly
const outputChannel = await interaction.client.channels.fetch(OUTPUT_CHANNEL_ID);
await outputChannel.send({
    content: `${user}`, // mention outside embed
    embeds: [visaEmbed],
    files: [attachment],
});

// ✅ Edit original deferred reply
await interaction.editReply({
    content: `🪪 Visa issued successfully to ${user}. Check <#${OUTPUT_CHANNEL_ID}>.`,
});


    // Optional: DM user
    try { await user.send({ embeds: [visaEmbed], files: [attachment] }); } catch {}

    // Optional: nickname
    try { await member.setNickname(`${NICKNAME_PREFIX} | ${charName}`); } catch {}

    // Optional: update roles
    try {
        if (member.roles.cache.has(ROLE_TO_REMOVE)) await member.roles.remove(ROLE_TO_REMOVE);
        await member.roles.add(ROLE_TO_ADD);
        await member.roles.add(ROLE_TO_ADD1);
    } catch {}
 }


});

// Listen for messages in all channels for role management
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // ✅ Trigger only in a specific channel
    if (message.channel.id !== "") return;

    try {
        const roleToRemove1 = message.guild.roles.cache.get("881760473324875817"); // 🔊┇VISA ACCEPTED CANDIDATE┇🔊
        const logChannel = message.guild.channels.cache.get("1360930979719544913"); // Logging channel

        if (!roleToRemove1 || !logChannel) {
            return console.log("One of the roles or the log channel is not found!");
        }

        const member = message.guild.members.cache.get(message.author.id);

        await member.roles.remove(roleToRemove1);

        // 🔔 Send log with mentions
        await logChannel.send(
            `✅ <@${message.author.id}> had the role <@&${roleToRemove1.id}> successfully removed.`
        );

    } catch (error) {
        console.error('Error assigning/removing roles:', error);
    }
 });





// Function to update player count
async function updatePlayerCount(channelId) {
    const options = {
        host: process.env.SAMP_HOST || " 46.183.184.33",
        port: parseInt(process.env.SAMP_PORT) || 2481,
        timeout: 3000
    };

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Function to query server and update channel
        const updateChannel = async () => {
            SampQuery(options, async (error, response) => {
                if (error) {
                    console.error('Error querying SAMP server:', error);
                    return;
                }

                // Add current player count to history
                const timestamp = moment().tz('Asia/Kolkata').format('HH:mm:ss');
                playerHistory.push({
                    time: timestamp,
                    count: response.online
                });

                // Keep only the last maxDataPoints entries
                if (playerHistory.length > maxDataPoints) {
                    playerHistory.shift();
                }

                // Create chart
                const chartConfig = {
                    type: 'line',
                    data: {
                        labels: playerHistory.map(point => point.time),
                        datasets: [{
                            label: 'Players Online',
                            data: playerHistory.map(point => point.count),
                            borderColor: '#00357a',
                            backgroundColor: 'rgba(0, 53, 122, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: 'Player Count History',
                                color: '#ffffff',
                                font: {
                                    size: 16
                                }
                            },
                            legend: {
                                labels: {
                                    color: '#ffffff'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#ffffff'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: '#ffffff'
                                }
                            }
                        }
                    }
                };

                // Generate chart image
                const image = await chartJSNodeCanvas.renderToBuffer(chartConfig);
                const attachment = new AttachmentBuilder(image, { name: 'player-chart.png' });

                // Create embed
                // Create player list field with proper formatting (no platform tags)
                let playerList = '';
                if (response.players && response.players.length > 0) {
                    playerList = response.players
                        .map((player, index) => {
                            const name = player.name || 'Unknown';
                            const score = typeof player.score !== 'undefined' ? player.score : '-';
                            return `${index + 1}. ${name} (Score: ${score})`;
                        })
                        .join('\n');
                } else {
                    playerList = 'No players online';
                }

                // Split player list if it's too long (Discord has a 1024 character limit per field)
                const chunks = [];
                if (playerList.length > 1024) {
                    const players = playerList.split('\n');
                    let currentChunk = '';
                    
                    for (const player of players) {
                        if (currentChunk.length + player.length + 1 > 1024) {
                            chunks.push(currentChunk);
                            currentChunk = player;
                        } else {
                            currentChunk += (currentChunk ? '\n' : '') + player;
                        }
                    }
                    if (currentChunk) chunks.push(currentChunk);
                } else {
                    chunks.push(playerList);
                }

                const embed = new EmbedBuilder()
                    .setColor('#00357a')
                    .setTitle('Vintage Roleplay Server Status')
                    .addFields(
                        { name: 'Players Online', value: `${response.online}/${response.maxplayers}`, inline: true },
                        { name: 'Last Updated', value: timestamp, inline: true }
                    );

                // Add player list fields (split into multiple fields if needed)
                chunks.forEach((chunk, index) => {
                    embed.addFields({
                        name: index === 0 ? 'Online Players' : 'Online Players (Continued)',
                        value: chunk
                    });
                });

                embed.setImage('attachment://player-chart.png')
                    .setFooter({ text: 'Updates every 10 seconds' })
                    .setTimestamp();

                // Update channel
                const messages = await channel.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();

                if (lastMessage && lastMessage.author.id === client.user.id) {
                    await lastMessage.edit({ embeds: [embed], files: [attachment] });
                } else {
                    await channel.send({ embeds: [embed], files: [attachment] });
                }
            });
        };

        // Initial update
        await updateChannel();

        // Update every 10 seconds
        setInterval(updateChannel, 10000);
    } catch (error) {
        console.error('Error in updatePlayerCount:', error);
    }
}
// ===== CONFIG =====
const RP_CHANNEL_ID = "1058461593786138624"; // RP ticket panel
const OOC_CHANNEL_ID = "1058461593786138624"; // OOC ticket panel
const RP_CATEGORY_ID = "1052610099186770031"; // RP ticket category
const OOC_CATEGORY_ID = "1052610099186770031"; // OOC ticket category
const TICKET_HANDLER_ROLE = "1058449275434057748";
const STAFF_TAG_ROLE = "1058449275434057748"; // role to tag
const LOG_CHANNEL_ID = "1058461593786138624"; // transcript log
// ==================

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await sendTicketEmbeds(client); // post panel embeds
  console.log("🎫 Ticket panels sent!");
});

// ====== Send Ticket Panels ======
async function sendTicketEmbeds(client) {
  const rpEmbed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎭 RP PACK Ticket System")
    .setDescription("Need RP Packs or help? Click below to open a ticket!")
    .setFooter({ text: "Vintage Roleplay | RP PACK Support" });

  const rpRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("rp_ticket")
      .setLabel("🎭 Open RP PACK Ticket")
      .setStyle(ButtonStyle.Primary)
  );

  const oocEmbed = new EmbedBuilder()
    .setColor("#2ECC71")
    .setTitle("💬 OOC RISE Ticket System")
    .setDescription("Need OOC support? Click below to open a ticket!")
    .setFooter({ text: "Vintage Roleplay | OOC RISE Support" });

  const oocRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ooc_ticket")
      .setLabel("💬 Open OOC Ticket")
      .setStyle(ButtonStyle.Secondary)
  );

  const rpChannel = await client.channels.fetch(RP_CHANNEL_ID);
  const oocChannel = await client.channels.fetch(OOC_CHANNEL_ID);

  // Clear old messages to avoid duplicates
  const rpMessages = await rpChannel.messages.fetch({ limit: 10 });
  const oocMessages = await oocChannel.messages.fetch({ limit: 10 });
  await Promise.all([
    ...rpMessages.map((m) => m.delete().catch(() => {})),
    ...oocMessages.map((m) => m.delete().catch(() => {})),
  ]);

  await rpChannel.send({ embeds: [rpEmbed], components: [rpRow] });
  await oocChannel.send({ embeds: [oocEmbed], components: [oocRow] });
}

// ====== Ticket Creation ======
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const user = interaction.user;
  const guild = interaction.guild;

  let categoryId, typeName;
  if (interaction.customId === "rp_ticket") {
    categoryId = RP_CATEGORY_ID;
    typeName = "RP PACK";
  } else if (interaction.customId === "ooc_ticket") {
    categoryId = OOC_CATEGORY_ID;
    typeName = "OOC RISE";
  } else if (interaction.customId === "close_ticket") {
    await closeTicket(interaction);
    return;
  } else return;

  // Determine channel name based on ticket type + username
  let ticketChannelName;
  if (typeName === "RP PACK") ticketChannelName = `rppack-ticket-${user.username.toLowerCase()}`;
  else if (typeName === "OOC RISE") ticketChannelName = `ooc-ticket-${user.username.toLowerCase()}`;
  else ticketChannelName = `ticket-${user.username.toLowerCase()}`;

  // Check if user already has a ticket
  const existing = guild.channels.cache.find(
    (ch) => ch.name === ticketChannelName && ch.type === ChannelType.GuildText
  );
  if (existing) {
    return interaction.reply({
      content: `❌ You already have a ticket open: ${existing}`,
      ephemeral: true,
    });
  }

  // Create ticket channel
  const ticketChannel = await guild.channels.create({
    name: ticketChannelName,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: TICKET_HANDLER_ROLE,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
    ],
  });

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  // Embed message inside ticket
  const ticketEmbed = new EmbedBuilder()
    .setTitle(`🎫 ${typeName} Ticket`)
    .setDescription(
      `Hello ${user}, thanks for opening a **${typeName}** ticket!\n\nThis ticket is for **${
        typeName === "RP PACK" ? "RP PACK support/requests" : "OOC RISE support"
      }**.`
    )
    .setColor(typeName === "RP PACK" ? "#5865F2" : "#2ECC71")
    .setFooter({ text: "Vintage Roleplay | Ticket Support" })
    .setTimestamp();

  await ticketChannel.send({
    embeds: [ticketEmbed],
    content: `<@&${STAFF_TAG_ROLE}>`,
    components: [closeButton],
  });

  await interaction.reply({
    content: `✅ Your ${typeName} ticket has been created: ${ticketChannel}`,
    ephemeral: true,
  });
});

// ====== Close Ticket + Transcript ======
async function closeTicket(interaction) {
  const channel = interaction.channel;
  const messages = await channel.messages.fetch({ limit: 100 });
  const content = Array.from(messages.values())
    .reverse()
    .map(
      (m) =>
        `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${
          m.content || "[Attachment/Embed]"
        }`
    )
    .join("\n");

  const filePath = `./transcript-${channel.name}.txt`;
  fs.writeFileSync(filePath, content);
  const attachment = new AttachmentBuilder(filePath);

  const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
  if (logChannel) {
    await logChannel.send({
      content: `📜 Transcript for **${channel.name}** closed by ${interaction.user.tag}`,
      files: [attachment],
    });
  }

  await interaction.reply("✅ Ticket closed. Transcript saved to logs.");
  setTimeout(() => channel.delete().catch(() => {}), 3000);
  fs.unlinkSync(filePath);
}


client.login(process.env.TOKEN);
//client.login("");