const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  Events,
} = require("discord.js");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

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
