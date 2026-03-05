const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { SpotifyPlugin } = require('@distube/spotify');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const distube = new DisTube(client, {
    emitNewSongOnly: true,
    leaveOnEmpty: false, 
    leaveOnFinish: false,
    plugins: [new YouTubePlugin(), new SpotifyPlugin()]
});

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce música')
        .addStringOption(opt => opt.setName('cancion').setDescription('Nombre o URL').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Salta la canción'),
    new SlashCommandBuilder().setName('stop').setDescription('Detiene todo'),
    new SlashCommandBuilder().setName('autoplay').setDescription('Modo automático')
].map(c => c.toJSON());

client.on('ready', async () => {
    console.log(`✅ ${client.user.tag} está en línea`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (err) { console.error(err); }
});

client.on('interactionCreate', async int => {
    if (!int.isChatInputCommand()) return;
    const { commandName, options, guildId, member, channel } = int;
    const vc = member.voice.channel;

    if (!vc) return int.reply({ content: "❌ ¡Entra a un canal de voz!", ephemeral: true });

    if (commandName === 'play') {
        await int.deferReply();
        const query = options.getString('cancion');
        distube.play(vc, query, { textChannel: channel, member });
        await int.editReply(`🔍 Buscando: **${query}**`);
    }

    if (commandName === 'skip') {
        distube.skip(guildId).then(() => int.reply("⏭️ Saltada")).catch(() => int.reply("❌ No hay más"));
    }

    if (commandName === 'stop') {
        distube.stop(guildId);
        int.reply("⏹️ Detenido");
    }

    if (commandName === 'autoplay') {
        const mode = distube.toggleAutoplay(guildId);
        int.reply(`🔁 Autoplay: **${mode ? "ON" : "OFF"}**`);
    }
});

client.login(process.env.TOKEN);