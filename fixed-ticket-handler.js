// ====== Ticket Creation ======
async function handleTicketCreation(interaction, type) {
  const user = interaction.user;
  const guild = interaction.guild;
  
  if (!guild) {
    throw new Error('Guild not found');
  }

  const channelName = type === "RP PACK" 
    ? `rppack-ticket-${user.username.toLowerCase()}`
    : `ooc-ticket-${user.username.toLowerCase()}`;

  // Check for existing ticket
  const existing = guild.channels.cache.find(
    ch => ch.name === channelName && ch.type === ChannelType.GuildText
  );
  
  if (existing) {
    throw new Error(`You already have a ticket open: ${existing}`);
  }

  // Create the ticket channel
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: type === "RP PACK" ? RP_CATEGORY_ID : OOC_CATEGORY_ID,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: TICKET_HANDLER_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  const ticketEmbed = new EmbedBuilder()
    .setTitle(`${type === "RP PACK" ? "🎫" : "💬"} ${type} Ticket`)
    .setDescription(
      type === "RP PACK"
        ? `Hello ${user}, thanks for opening a **${type}** ticket!\n\nThis ticket is for **RP PACK support/requests**.`
        : `Hello ${user}, thanks for opening an **OOC RISE** ticket!\n\nPlease fill out the details below:\n\n` +
          `**Complaint from:**-\n` +
          `**Complaint against:**-\n` +
          `**Complaint reason:**-\n` +
          `**Attach proof:**-`
    )
    .setColor(type === "RP PACK" ? "#5865F2" : "#2ECC71")
    .setFooter({ text: `Vintage Roleplay | ${type} Support` })
    .setTimestamp();

  await ticketChannel.send({
    embeds: [ticketEmbed],
    content: `<@&${STAFF_TAG_ROLE}>`,
    components: [closeButton]
  });

  return ticketChannel;
}

// ====== Close Ticket Handler ======
async function closeTicket(interaction) {
  try {
    if (!interaction.channel) return;
    
    await interaction.deferReply();
    
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 100 });
    const content = Array.from(messages.values())
      .reverse()
      .map(m => `[${m.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${m.author.tag}: ${m.content || "[Attachment/Embed]"}`)
      .join("\n");

    const filePath = `./transcript-${channel.name}.txt`;
    fs.writeFileSync(filePath, content);
    
    const attachment = new AttachmentBuilder(filePath);
    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    
    if (logChannel) {
      await logChannel.send({
        content: `📜 Transcript for **${channel.name}** closed by ${interaction.user.tag}`,
        files: [attachment]
      });
    }

    await interaction.editReply("✅ Ticket closed. Transcript saved to logs.");
    
    setTimeout(async () => {
      try {
        await channel.delete();
      } catch (error) {
        console.error('Error deleting channel:', error);
      }
    }, 3000);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error closing ticket:', error);
    try {
      await interaction.editReply("❌ An error occurred while closing the ticket.");
    } catch (e) {
      console.error('Error sending error response:', e);
    }
  }
}

// ====== Button Interaction Handler ======
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    // Handle close ticket button
    if (interaction.customId === "close_ticket") {
      await closeTicket(interaction);
      return;
    }

    // Handle ticket creation buttons
    if (["rp_ticket", "ooc_ticket"].includes(interaction.customId)) {
      await interaction.deferReply({ ephemeral: true });
      
      const type = interaction.customId === "rp_ticket" ? "RP PACK" : "OOC RISE";
      const channel = await handleTicketCreation(interaction, type);
      
      await interaction.editReply({
        content: `✅ Your ${type} ticket has been created: ${channel}`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error in ticket system:', error);
    const errorMsg = error.message.includes("already have a ticket open")
      ? error.message
      : "❌ An error occurred. Please try again later.";

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      } else if (!interaction.replied) {
        await interaction.editReply({ content: errorMsg, ephemeral: true });
      }
    } catch (e) {
      console.error('Error sending error response:', e);
    }
  }
});