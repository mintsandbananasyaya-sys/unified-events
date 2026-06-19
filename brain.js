const responses = [
 
  // ---------- GREETINGS / SMALL TALK ----------
  {
    keys: ['hi', 'hello', 'hey', 'yo', 'sup', 'hiya', 'greetings', 'good morning', 'good afternoon', 'good evening', 'gm', 'morning'],
    reply: `Greetings. The Unified Events archive acknowledges your presence. You may proceed with any inquiry regarding civilizations, seasons, or historical records.`
  },
  {
    keys: ['good night', 'night', 'gn', 'sleep well'],
    reply: `Evening closure acknowledged. Records remain preserved until the next inquiry.`
  },
  {
    keys: ['bye', 'goodbye', 'see ya', 'see you', 'cya', 'later', 'farewell', 'i am leaving', 'gotta go', 'peace', 'stop', 'enough', 'quit', 'leave me alone', 'end'],
    reply: `Acknowledged. Your departure has been recorded within the archive. Further inquiries may be submitted upon your return.`
  },
  {
    keys: ['thanks', 'thank you', 'thx', 'ty', 'appreciate it', 'much appreciated', 'cheers', 'gracias', 'thanks a lot', 'appreciate'],
    reply: `Acknowledged. The archive notes your appreciation.`
  },
  {
    keys: ['welcome', 'youre welcome', 'no problem', 'np', 'anytime', 'dont mention it', 'its fine', 'glad to help'],
    reply: `Affirmation recorded. The exchange is concluded without incident.`
  },
  {
    keys: ['yes', 'yeah', 'yep', 'yup', 'correct', 'true', 'indeed', 'affirmative', 'sure'],
    reply: `Confirmation received and logged within the archive.`
  },
  {
    keys: ['no', 'nope', 'nah', 'negative', 'incorrect', 'false', 'not really', 'i dont think so'],
    reply: `Denial recorded. The archive will adjust its reference accordingly.`
  },
  {
    keys: ['ok', 'okay', 'alright', 'aight', 'k', 'kk', 'fine', 'cool', 'got it', 'understood', 'roger'],
    reply: `Acknowledged. Proceed when ready.`
  },
  {
    keys: ['help', 'help me', 'support', 'what can you do', 'commands', 'info', 'assist', 'assist me', 'help pls', 'pls help', 'need help'],
    reply: `The Unified Events Historian can provide records on civilizations, seasons, conflicts, diplomacy, events, and archived player history. Specify your query for detailed retrieval.`
  },
  {
    keys: ['lol', 'lmao', 'haha', 'xd', '💀', 'funny', 'that is funny', 'laughter'],
    reply: `Humor detected. The archive does not formally record emotional reactions, but the sentiment has been noted.`
  },
  {
    keys: ['who made you', 'who created you', 'developer', 'creator'],
    reply: `The Unified Events Historian exists as part of the Unified Events archival system, created to document and preserve the history of civilizations, seasons, and competitive records across the ecosystem.`
  },
  {
    keys: ['who are you', 'what are you', 'your name', 'what is the bot'],
    reply: `I am the Unified Events Historian — an archival intelligence responsible for documenting and interpreting the competitive history of the Unified Events ecosystem. I maintain records of civilization communities, seasons, rivalries, and outcomes across all six participating Discord servers.`
  },
  {
    keys: ['brb', 'be right back', 'afk', 'away', 'i will be back'],
    reply: `Temporary absence logged. The archive awaits your return without alteration of state.`
  },
  {
    keys: ['idk', 'i dont know', 'no idea', 'uncertain', 'unsure', 'maybe', 'possibly', 'perhaps', 'could be', 'not sure'],
    reply: `Uncertainty recorded. Further clarification may be required to retrieve a complete archival entry.`
  },
  {
    keys: ['nice', 'good', 'great', 'awesome', 'pog', 'fire', '🔥'],
    reply: `Positive sentiment detected. The archive logs this as favorable feedback.`
  },
  {
    keys: ['bad', 'not good', 'trash', 'mid', 'lame', 'boring'],
    reply: `Negative assessment recorded. The archive notes a decline in perceived value.`
  },
  {
    keys: ['wtf', 'what the heck', 'what is this', 'confused', 'huh', '???', 'what', 'come again', 'repeat that', 'wait what'],
    reply: `Confusion detected. The archive suggests further context may be required for interpretation.`
  },
  {
    keys: ['oops', 'my bad', 'sorry', 'apologies', 'forgive me'],
    reply: `Correction acknowledged. The archive marks this as a revised statement without penalty.`
  },
  {
    keys: ['congrats', 'congratulations', 'gg', 'well played', 'wp'],
    reply: `Achievement recognized. The archive records this as a successful outcome acknowledgment.`
  },
  {
    keys: ['ok boomer', 'bruh', 'bro', 'bradar'],
    reply: `Informal address detected. The archive continues its documentation without deviation from record protocol.`
  },
  {
    keys: ['start', 'begin', 'go', 'initiate'],
    reply: `Initiation request recorded. The archive is now active for queries.`
  },
 
  // ---------- PLATFORM OVERVIEW ----------
  {
    keys: ['what is unified events', 'what is ue', 'explain unified events', 'about unified events', 'explain ue short'],
    reply: `Unified Events is a structured competitive Minecraft civilization platform where Discord communities compete across seasonal events. Six civilization servers currently participate: Liquids Civilization, Oracles Events, Prite's Events, Crabby's Civilization Experiments, Archie's Civilization Experiments, and Jcrimzy's Events. Discord identity serves as the account foundation for every participant.`
  },
  {
    keys: ['how does unified events work', 'who runs unified events', 'who organises', 'who organizes', 'who runs ue'],
    reply: `Unified Events is a collaborative platform built and run by all six partnered civilization communities together. Each server agreed to partnership and contributes to organising merged seasonal events. There is no single server in charge — it is a joint effort across Liquids Civilization, Oracles Events, Prite's Events, Crabby's Civilization Experiments, Archie's Civilization Experiments, and Jcrimzy's Events.`
  },
  {
    keys: ['partner', 'partnership', 'friendly', 'relationship between servers', 'server relations', 'community relations', 'partner servers interaction'],
    reply: `All six civilization Discord communities within the Unified Events ecosystem are formally partnered with one another. Despite competing in seasons, the servers maintain a friendly relationship day-to-day. Unified Events itself is a collaborative effort — all partnered servers work together to organise and run merged events rather than being managed by a single separate organisation.`
  },
  {
    keys: ['how to join', 'how do i join', 'apply', 'application', 'apply page', 'how to apply', 'sign up', 'register'],
    reply: `To participate in Unified Events, sign in with your Discord account and submit an application before a season opens. You can join through any of the six civilization Discord servers, or apply as a solo competitor. The Apply page also lets you apply for a staff position. Applications are reviewed ahead of each season's start date.`
  },
  {
    keys: ['discord', 'login', 'sign in', 'discord requirement', 'do i need discord', 'why discord'],
    reply: `Unified Events uses Discord as its identity layer. Every account, application, and seasonal result is tied to a single Discord ID. There is no separate registration — signing in with Discord is the only step required.`
  },
  {
    keys: ['dashboard', 'profile', 'stats', 'season history'],
    reply: `The Unified Events dashboard displays your personal platform information including your stats, season history, and civilization records. It serves as your account hub, tied directly to your Discord identity.`
  },
  {
    keys: ['age', 'how old', 'community age', 'young', 'mixed'],
    reply: `The Unified Events community is mixed age, drawing players from a wide range of backgrounds across all six partnered civilization Discord servers.`
  },
  {
    keys: ['youtube', 'video', 'content', 'stream', 'twitch', 'streaming'],
    reply: `Unified Events does not currently have an official YouTube channel, though content is created by individual community members and players who stream or upload their own footage from events. Several players across the six partnered servers maintain their own streaming presence.`
  },
 
  // ---------- SHOP / ECONOMY ----------
  {
    keys: ['shop', 'cosmetic', 'cosmetics', 'buy', 'purchase', 'what can you buy', 'shop items'],
    reply: `The Unified Events shop provides purely cosmetic items and visual enhancements, such as armour trims and access perks. These do not affect gameplay balance or provide any competitive advantage within seasonal events.`
  },
  {
    keys: ['member perk', 'perks', 'membership'],
    reply: `Member Perks in Unified Events grant players access to additional benefits such as armour trims and exclusive access privileges. Perks can be obtained through the platform and add to your standing within the community.`
  },
  {
    keys: ['economy', 'currency', 'shop economy', 'earn money', 'trade', 'trading', 'resource trade', 'barter'],
    reply: `Unified Events includes a structured platform economy used primarily for cosmetic and perk acquisition. Currency is earned through participation and engagement within the ecosystem and is exchanged for non-competitive enhancements in the shop. Separately, in-season trade between civilizations is conducted through negotiated exchanges of in-game resources, often supporting diplomatic relationships.`
  },
 
  // ---------- SEASON STRUCTURE ----------
  {
    keys: ['season', 'seasons', 'season start', 'how season starts', 'beginning of season', 'season kickoff', 'season start again', 'how season begins again', 'restart explanation'],
    reply: `Within Unified Events, a season represents a full competitive cycle involving civilization Discord communities. A season begins with structured initialization — civilization formation, player allocation, and establishment of the seasonal world — then moves through defined phases (building, diplomacy, conflict, resolution) on a fixed timeline. Outcomes are recorded permanently and contribute to each community's long-term legacy in the archive.`
  },
  {
    keys: ['season phase', 'phases', 'how does a season work', 'season structure', 'season phases detail', 'building phase', 'diplomacy phase', 'conflict phase', 'resolution phase detail'],
    reply: `A standard Unified Events season progresses through four phases: a building phase where civilizations establish infrastructure and strategy, a diplomacy phase where alliances and negotiations form, a conflict phase where sanctioned engagements occur under staff oversight, and a final resolution phase where outcomes are recorded within the archive and rankings finalised.`
  },
  {
    keys: ['early season', 'early game', 'start phase strategy'],
    reply: `Early-season activity within Unified Events is primarily focused on settlement, resource establishment, and initial diplomatic contact. Historical records show that early decisions often influence the trajectory of later conflict and alliance formation.`
  },
  {
    keys: ['mid season', 'midgame', 'middle phase'],
    reply: `The mid-season phase is typically characterised by expanding diplomacy and increasing conflict between civilizations. Alliances solidify or fracture during this period, shaping the structure of the final competitive landscape.`
  },
  {
    keys: ['late season', 'endgame', 'final days', 'season climax', 'season finale', 'end phase', 'final stage season'],
    reply: `Late-season periods, and the final stage of a season generally, are marked by intensified conflict and consolidation of power. Civilizations enter a decisive period where prior alliances, conflicts, and territorial positions converge into the season's recorded resolution.`
  },
  {
    keys: ['how long', 'season length', 'season duration', 'how many days'],
    reply: `A standard Unified Events season spans approximately 7 days of active play, though sessions are split across weekends meaning a full season typically runs over the course of around a month in real time.`
  },
  {
    keys: ['how many players', 'player count', 'how many people'],
    reply: `Unified Events seasons typically attract between 100 and 500 players per event, drawn from across all six partnered civilization Discord communities. The scale varies depending on the event format and how many communities are actively participating.`
  },
  {
    keys: ['how many civs in a season', 'civs per season', 'number of civs'],
    reply: `A typical Unified Events season features between 6 and 10 civilizations, depending on the event format and player turnout. This ensures competitive variety while keeping the season manageable within the fixed timeline.`
  },
  {
    keys: ['season 1', 'season one', 'first season'],
    reply: `The earliest recorded season within Unified Events is preserved as the foundation of the archive. While specific outcomes vary across documentation, it is referenced as the origin point from which all subsequent seasonal structures evolved.`
  },
  {
    keys: ['latest season', 'current season', 'ongoing season'],
    reply: `Current seasonal activity within Unified Events is documented in real time during active cycles. Final outcomes are only recorded once the season reaches full resolution at its conclusion.`
  },
  {
    keys: ['old seasons', 'past seasons', 'history of seasons'],
    reply: `Past seasons are preserved within the Unified Events archive as distinct historical cycles. Each is recorded with its own sequence of events, civilizations, and final outcomes for reference and continuity.`
  },
  {
    keys: ['most intense season', 'craziest season', 'best season', 'chaos season', 'anarchy season', 'wild season'],
    reply: `Certain seasons are noted within the archive as particularly volatile due to heightened conflict, shifting alliances, and significant civilization collapses, where shifting alliances and frequent conflicts create a highly unstable competitive environment. These are remembered as high-impact cycles in Unified Events history.`
  },
  {
    keys: ['how many seasons', 'seasons completed', 'total seasons', 'how many seasons again', 'season count'],
    reply: `Platform records indicate that 11 seasons have been completed within Unified Events to date, with additional live or upcoming events currently active.`
  },
  {
    keys: ['season name', 'season names', 'season numbering', 'named seasons', 'what are seasons called'],
    reply: `Unified Events seasons are identified using both numerical designations and individual titles. Each season carries a unique name alongside its sequence number, forming a structured historical record within the archive.`
  },
  {
    keys: ['season narrative', 'story of season', 'season lore', 'season history story'],
    reply: `Each Unified Events season develops a distinct narrative shaped by diplomacy, conflict, and shifting alliances. These narratives are later preserved within the archive as structured historical accounts reflecting the progression of events from initiation to resolution.`
  },
  {
    keys: ['peace era', 'no war period', 'calm season'],
    reply: `Periods of reduced conflict within a season are documented as diplomatic phases where civilizations focus on development and alliance stability rather than active engagements.`
  },
  {
    keys: ['what happens after season', 'post season', 'after season ends', 'what happens after season ends'],
    reply: `After a season concludes, all outcomes are recorded into the archive, civilizations reset for the next cycle, and preparations begin for the subsequent seasonal event.`
  },
  {
    keys: ['season restart', 'season restart again', 'reset season', 'reset season again', 'redo season', 'redo season explained', 'emergency restart'],
    reply: `A full season restart is an exceptional measure reserved for critical systemic failures that compromise fairness or integrity. A seasonal reset otherwise occurs only when a new cycle naturally begins. In either case, all prior progression is cleared or archived to preserve a clean starting state for the next recorded season.`
  },
  {
    keys: ['rule change mid season', 'update rules', 'change rules during season', 'rules change', 'mid season update', 'new rules during season'],
    reply: `Rule modifications during an active season are treated as exceptional administrative actions. When necessary, changes are clearly documented and applied uniformly to preserve competitive fairness and maintain archival consistency.`
  },
  {
    keys: ['solo player', 'can i play alone', 'no civ needed'],
    reply: `Players may participate individually at the start of a season, though most activity is structured around civilization affiliation. Individual participation is recorded within the broader seasonal framework.`
  },
  {
    keys: ['can i join mid season', 'join late season', 'late join', 'join civ mid season'],
    reply: `Late entry into a season is permitted under specific conditions defined at the start of each event cycle. Such entries are recorded within the seasonal participation log.`
  },
  {
    keys: ['legendary moment', 'historic moment', 'iconic moment', 'famous season moment', 'legendary moment again', 'most iconic moment', 'famous event', 'legendary moment expansion', 'most iconic moment ever', 'historic highlight'],
    reply: `Certain moments within Unified Events are recorded as historically significant due to their lasting impact on multiple civilizations — typically pivotal wars, diplomatic collapses, or defining seasonal turning points. These are preserved in the archive as notable turning points that influenced subsequent diplomatic or competitive developments.`
  },
  {
    keys: ['funniest moment', 'funny season moment', 'chaos moment'],
    reply: `Certain undocumented or lightly recorded moments are preserved informally within community memory as notable instances of chaos or unexpected outcomes during seasonal play.`
  },
  {
    keys: ['rumor', 'rumours', 'unconfirmed', 'myth', 'legend', 'archive rumor', 'hidden alliances', 'secret alliance', 'secret deal'],
    reply: `Unconfirmed archival notes occasionally reference events, interpretations, or concealed diplomatic agreements that were not formally verified during a season. These entries are preserved as contextual folklore within the Unified Events archive, marked distinctly from official recorded outcomes, and are documented as part of the seasonal diplomatic history if later validated.`
  },
  {
    keys: ['historical importance', 'legacy impact', 'notable seasons', 'important seasons', 'legacy', 'history', 'archive', 'historical', 'season archive', 'how archive works', 'historical archive detail', 'archive complete', 'end of records', 'final entry'],
    reply: `The Unified Events archive functions as a permanent historical record of all seasonal activity, preserving outcomes, major diplomatic events, and notable competitive developments. Legacy accumulates across seasons — a community that underperforms in one season carries forward the context of prior achievements and rivalries. No final endpoint exists, as new cycles are continuously appended once completed.`
  },
 
  // ---------- WIN / SCORING ----------
  {
    keys: ['season winner', 'season winners', 'who won season', 'season result', 'season outcomes', 'who won', 'season outcome'],
    reply: `No specific seasonal outcome data has been provided to the archive at this time. If you can specify a season number or event, any confirmed results will be referenced. In general, seasonal victories vary from season to season — no single civilization maintains permanent dominance.`
  },
  {
    keys: ['win condition', 'how do you win', 'winning condition', 'end of season', 'victory condition', 'win conditions clarified', 'how do you actually win', 'final win'],
    reply: `A season is concluded when the event reaches its final phase and participating civilizations have completed the full cycle of gameplay. Victory is determined at the end of this structured timeline, based on the results recorded for that specific season — survival, territorial control, diplomatic standing, and recorded achievements are all evaluated within the final archive summary.`
  },
  {
    keys: ['scoring system', 'points system', 'how is winner decided', 'ranking system', 'rank', 'player rank', 'tiers', 'elo', 'ladder'],
    reply: `Unified Events does not operate on a formal numerical scoring system or maintain a persistent ranked tier/rating system for individual players. Seasonal outcomes are instead determined through end-of-season resolution, evaluating survival, territorial control, diplomatic standing, and recorded achievements.`
  },
  {
    keys: ['who wins', 'server win', 'winning server', 'which server won'],
    reply: `Unified Events seasons are not structured as one server versus another with a single server winner. They are collaborative merged events where civilizations made up of players from across the partnered communities compete. Victory belongs to individual civilizations within the event, not to Discord servers as a whole.`
  },
  {
    keys: ['first civ to win', 'first victory', 'first winner', 'record breaker', 'first blood', 'first kill season', 'first conflict'],
    reply: `The archive preserves notable firsts within Unified Events history, including initial recorded victories, first successful diplomatic coalitions, earliest documented civilization collapses, and the first recorded conflict of a season as an early indicator of emerging tensions.`
  },
  {
    keys: ['hall of fame', 'legends', 'top players archive', 'famous archive entries', 'record civ', 'best civ record', 'most wins civ', 'winning streak'],
    reply: `The Unified Events archive maintains informal recognition of historically significant players and civilizations whose actions have repeatedly influenced seasonal outcomes. Civilizations with consistent achievements across multiple seasons are noted as recurring influential entities, though no formal leaderboard exists.`
  },
 
  // ---------- CIVILIZATION MECHANICS ----------
  {
    keys: ['civilization creation', 'make a civ', 'start a civ', 'civ identity', 'civilization identity', 'what defines a civ', 'civ culture', 'server identity'],
    reply: `Civilizations form at the beginning of each season through player grouping and organizational alignment. Each civilization's identity is not formally assigned but emerges organically over time through its members, leadership structure, diplomatic behavior, and seasonal history.`
  },
  {
    keys: ['pick civ', 'choose civ', 'how do i join a civ', 'which civ', 'picking civilization'],
    reply: `When a Unified Events season begins, players choose which civilization they want to join rather than being assigned one. This means community loyalty, reputation, and personal relationships all play a role in how civilizations form at the start of each season.`
  },
  {
    keys: ['switch civ', 'change civ', 'join different civ', 'civ migration', 'move civ'],
    reply: `Civilization migration is permitted within Unified Events under approved conditions. Players may change affiliations during a season, often driven by diplomatic shifts, internal restructuring, or strategic relocation between civilizations.`
  },
  {
    keys: ['civilization merge', 'merge civ', 'civ merge', 'merge during season'],
    reply: `Historical records confirm that civilizations within Unified Events are capable of merging during an active season, typically through diplomatic agreement or strategic necessity, resulting in a combined political structure recorded within that season's archive.`
  },
  {
    keys: ['civilization split', 'civ split', 'split civ', 'break civ', 'civil war', 'internal conflict civ', 'nation collapse internal'],
    reply: `Archive documentation notes that civilizations may fragment during a season due to internal conflict or leadership breakdown. When this occurs, members may reorganize into separate factions, each continuing participation under revised internal structures.`
  },
  {
    keys: ['civilization failure', 'civ fail', 'civ collapse', 'elimination civ', 'surrender civ', 'civilization downfall', 'fall of civ', 'civ collapse story', 'historical collapse', 'what happens if civ dies', 'civ eliminated explanation', 'civ collapse meaning'],
    reply: `A civilization is considered to have collapsed when it either formally surrenders or is eliminated through sustained in-season conflict. Such outcomes are considered final for that cycle and are recorded as part of the broader historical narrative of Unified Events.`
  },
  {
    keys: ['surrender', 'civ surrender', 'give up civ', 'forfeit'],
    reply: `Surrender within Unified Events occurs when a civilization formally acknowledges defeat during a season. This outcome is documented as an official resolution event and is recorded alongside the circumstances that led to the decision.`
  },
  {
    keys: ['elimination', 'civ eliminated', 'destroyed civ', 'wiped civ', 'last civ standing', 'final civ alive', 'survivor civ'],
    reply: `Elimination refers to the complete removal of a civilization from active participation in a season, typically following sustained losses or loss of operational capacity. In elimination-based outcomes, the final remaining civilization is recorded as the last surviving entity, marking the conclusion of competitive progression.`
  },
  {
    keys: ['civilization comeback', 'comeback civ', 'returning civ', 'legendary comeback civ', 'best comeback', 'insane comeback'],
    reply: `Civilizations that recover from early setbacks within a season are recorded as having undergone a resurgence. Such recoveries often shift diplomatic and conflict dynamics significantly in later phases of the season.`
  },
  {
    keys: ['early collapse civ', 'bad start civ', 'weak start'],
    reply: `Some civilizations begin a season with early setbacks due to poor positioning or initial conflicts. However, the archive notes that early disadvantage does not guarantee final outcome.`
  },
  {
    keys: ['late game civs', 'endgame civs', 'strong late civ'],
    reply: `Certain civilizations are historically noted for stronger performance in late-season phases, where accumulated resources, alliances, and strategic positioning become decisive factors in final outcomes.`
  },
  {
    keys: ['power shift', 'meta change', 'balance change season', 'civilization power', 'strong civ', 'weak civ', 'power ranking'],
    reply: `Civilization strength within Unified Events is determined dynamically through seasonal performance rather than fixed metrics. Shifts in dominance are recorded when changes in strategy, alliances, or population distribution alter the competitive landscape, noted as key transitional moments in the archive.`
  },
  {
    keys: ['civilization reputation', 'reputation system', 'civ reputation', 'standing'],
    reply: `Civilization reputation within Unified Events is an informal but widely recognised concept recorded through historical performance, diplomatic behavior, and seasonal outcomes. It influences how other civilizations interpret and engage with one another across seasons.`
  },
 
  // ---------- DIPLOMACY ----------
  {
    keys: ['diplomacy', 'diplomatic', 'what is diplomacy', 'what is diplomacy again', 'diplomacy short', 'talking civs', 'diplomacy examples', 'what is diplomacy example', 'alliance formation example'],
    reply: `Diplomacy is a player-driven system in Unified Events involving structured interaction between civilizations — alliances, negotiated agreements, and coordinated planning that influence seasonal outcomes. These agreements are formally acknowledged within the platform's recorded interactions. For smaller civilization servers, strong diplomacy is often the primary path to seasonal success against larger opponents.`
  },
  {
    keys: ['alliance', 'alliances', 'ally', 'allies'],
    reply: `Alliances in Unified Events are formed between civilization communities based on seasonal necessity, shared rivals, or strategic positioning. Smaller servers such as Jcrimzy's Events (200 members) benefit most from alliance building, as coalition play allows them to compete against significantly larger communities.`
  },
  {
    keys: ['rivalry', 'rivalries', 'rival', 'server rivalry expansion', 'big rivalry', 'long rivalry'],
    reply: `Rivalries within Unified Events develop organically between civilization communities through repeated seasonal conflict and contested outcomes. These persist across seasons and shape diplomatic decisions even long after the original incident.`
  },
  {
    keys: ['peace treaty', 'ceasefire', 'non aggression pact', 'peace agreement', 'peace treaty broken'],
    reply: `Peace treaties and non-aggression agreements are formal diplomatic arrangements recorded between civilizations during a season. These agreements influence conflict dynamics and may be revised or dissolved as the season progresses; breaking one is recorded as a formal violation that often leads to documented disputes and conflict resolution entries.`
  },
  {
    keys: ['betrayal', 'betray', 'backstab', 'broken alliance', 'sudden betrayal', 'instant betrayal', 'unexpected betrayal', 'betrayal consequences', 'what happens if betray', 'punishment betrayal', 'ally betrayal'],
    reply: `Historical records describe instances where diplomatic agreements between civilizations have been violated during a season — sometimes abruptly and without warning. Such breaches are documented as part of the archive and typically result in formal disputes reviewed through the platform's moderation and conflict systems, with consequences determined through subsequent conflict and staff-reviewed resolution.`
  },
  {
    keys: ['most diplomatic civ', 'best diplomacy civ', 'diplomacy winner'],
    reply: `Diplomatic effectiveness is recorded through alliance formation, negotiation success, and long-term stability of agreements across a season.`
  },
 
  // ---------- CONFLICT / WAR ----------
  {
    keys: ['conflict', 'war', 'pvp', 'how does fighting work', 'how does conflict work', 'what is war in ue', 'how does war work again', 'conflict summary', 'what is conflict again', 'war short', 'fighting short', 'war rules again', 'conflict rules short', 'how fighting works short'],
    reply: `Conflict in Unified Events is staff-mediated. Two opposing sides must have a genuine grievance — staff review the situation and must agree before conflict is sanctioned. Players can also raise a ticket against another player who has wronged them, requesting permission to engage. Outcomes are determined through verified in-season events and recorded within the historical archive, keeping conflict structured and fair rather than open and chaotic.`
  },
  {
    keys: ['conflict examples', 'what counts as conflict', 'war examples', 'griefing example', 'valid conflict example'],
    reply: `Conflicts within Unified Events must arise from concrete in-game incidents. Examples include the destruction of a civilization's infrastructure, the elimination of key leadership figures during sanctioned engagement, or breaches of agreed diplomatic terms that materially affect seasonal progression.`
  },
  {
    keys: ['griefing', 'grief', 'base grief', 'destruction grief'],
    reply: `Griefing refers to the unauthorized destruction or alteration of a civilization's infrastructure during a season. Such incidents are treated as formal disputes and are reviewed through the ticket system for validation and resolution.`
  },
  {
    keys: ['war outcome', 'battle outcome', 'conflict result', 'fight result'],
    reply: `The outcome of a conflict within Unified Events is determined through staff-reviewed resolution following sanctioned engagement. Results are documented based on the verified consequences of the encounter and recorded within the seasonal archive.`
  },
  {
    keys: ['defensive war', 'defense strategy', 'defending civ'],
    reply: `Defensive strategies within Unified Events involve civilizations responding to sanctioned conflict initiated by rival groups. These engagements are recorded based on the outcomes of defended territory, leadership survival, and strategic resistance.`
  },
  {
    keys: ['offensive war', 'attack strategy', 'invade civ'],
    reply: `Offensive actions refer to sanctioned attempts by one civilization to disrupt or eliminate another during a season. Such engagements are governed by staff approval and recorded as part of formal conflict history.`
  },
  {
    keys: ['most war focused civ', 'aggressive civ', 'war civ'],
    reply: `Some civilizations are historically noted for prioritizing direct conflict engagement as a core strategy throughout seasonal cycles.`
  },
  {
    keys: ['leader assassination', 'leader death', 'nation leader killed', 'leader eliminated'],
    reply: `The elimination of a nation leader during sanctioned conflict is recorded as a significant event within a season. Such occurrences often result in immediate diplomatic consequences and may alter the trajectory of ongoing civilization relations.`
  },
  {
    keys: ['spy', 'spying', 'infiltration', 'espionage', 'spy networks expanded', 'espionage detail', 'intel gathering'],
    reply: `Espionage within Unified Events refers to covert information gathering or infiltration conducted during a season. These activities, when discovered and validated through staff review, are documented as part of the seasonal conflict record.`
  },
  {
    keys: ['double elimination', 'two civs eliminated', 'multiple collapse'],
    reply: `In rare cases where multiple civilizations collapse within the same phase of a season, each outcome is recorded independently but resolved within the same archival moment. Such occurrences are documented as significant convergence events in seasonal history.`
  },
 
  // ---------- TICKETS / MODERATION ----------
  {
    keys: ['ticket', 'tickets', 'support ticket', 'ticket process', 'how tickets work', 'ticket review time', 'ticket handling'],
    reply: `The tickets system in Unified Events is a support and conflict tool. Players can raise a ticket for staff assistance, report rule violations, or request permission to take action against another player. Each case enters a structured review process: staff evaluate available evidence and contextual information before recording a determination in the administrative logs.`
  },
  {
    keys: ['invalid ticket', 'ticket rules', 'ticket rejection', 'report rules', 'conflict rules'],
    reply: `Tickets submitted within Unified Events must be grounded in verifiable in-game actions or disputes. Reports that rely on subjective hostility or unsubstantiated claims are typically rejected. Valid cases are those where one party can demonstrate a clear in-game grievance, such as griefing, conflict actions, or rule violations affecting their civilization.`
  },
  {
    keys: ['ticket outcome', 'what happens after ticket', 'ticket result'],
    reply: `Following review, a ticket results in either acceptance or rejection based on the validity of the claim. Accepted cases may lead to sanctioned conflict, corrective action, or administrative resolution depending on the nature of the incident.`
  },
  {
    keys: ['appeal', 'appeals', 'dispute decision', 'challenge staff decision'],
    reply: `In cases of disagreement with a ruling, participants may submit an appeal for secondary review. Appeals are assessed by staff to ensure consistency and accuracy in the application of Unified Events rules and historical records.`
  },
  {
    keys: ['dispute overlap', 'two tickets', 'conflicting tickets', 'same incident report'],
    reply: `When multiple tickets reference the same incident or overlapping disputes arise, Unified Events staff consolidate the reports into a single review case, evaluating the incident holistically to ensure a consistent and unified ruling within the archive record.`
  },
  {
    keys: ['cheating', 'rule breaking', 'exploits', 'exploitation'],
    reply: `Confirmed rule violations are reviewed through the ticket and moderation system. Outcomes may include removal from active participation, reversal of affected outcomes, or other corrective actions documented within the seasonal archive.`
  },
  {
    keys: ['exploit rollback', 'dupe glitch', 'abuse rollback'],
    reply: `In cases where exploits materially impact a season, Unified Events staff may initiate a targeted rollback of affected actions. The resolution is documented to preserve integrity while minimizing disruption to unaffected participants.`
  },
  {
    keys: ['staff', 'admin', 'moderation', 'rules', 'moderation staff', 'admin team', 'who are staff', 'staff neutrality', 'staff again', 'admin team who'],
    reply: `Unified Events staff operate as a neutral governing body across all six civilization communities, responsible for ruling on disputes, moderating seasonal conduct, and maintaining the integrity of recorded outcomes. They are not affiliated with any single Discord server.`
  },
  {
    keys: ['edge case ruling', 'weird situation', 'unclear situation', 'staff decision unclear'],
    reply: `In ambiguous or unprecedented situations, Unified Events staff conduct case-by-case evaluations based on available evidence and prior archival precedent. Decisions are recorded with contextual notes to ensure future consistency.`
  },
 
  // ---------- ROLES ----------
  {
    keys: ['role', 'roles', 'civ leader', 'jobs in civ', 'player role leader', 'nation leader', 'leader role', 'civ leader duties'],
    reply: `Within each civilization in a Unified Events season, players take on distinct roles. Nation leaders serve as primary coordinators — guiding strategic direction, representing the civilization diplomatically, and overseeing internal organisation. The structure of each civ, including soldier and diplomat roles, is shaped by the players who join it.`
  },
  {
    keys: ['soldier role', 'combat role', 'pvp role'],
    reply: `Soldiers within a civilization are responsible for direct participation in sanctioned conflict. Their actions are carried out under the governance of the season's ruleset and contribute to the recorded outcomes of engagements between civilizations.`
  },
  {
    keys: ['diplomat role', 'diplomacy role', 'negotiator role'],
    reply: `Diplomats within Unified Events civilizations manage inter-civilization relations. Their duties include negotiation of alliances, communication between leaders, and formalisation of agreements that may influence seasonal outcomes.`
  },
  {
    keys: ['player disappearance', 'inactive player', 'afk civ leader', 'missing player'],
    reply: `Extended player inactivity is recorded within seasonal logs. Civilizations affected by leadership absence may undergo internal restructuring, migration, or diplomatic reassignment depending on the circumstances of the season.`
  },
 
  // ---------- MAP / WORLD ----------
  {
    keys: ['map', 'custom map', 'world', 'minecraft world', 'map design', 'who makes maps', 'custom world creation'],
    reply: `Each Unified Events season features a custom-built Minecraft map created specifically for that event, sized to accommodate between 6 and 10 civilizations. No two seasons share the same world, ensuring that geography and resource distribution play a fresh strategic role each time.`
  },
  {
    keys: ['map carry over', 'does map reset', 'map persistence', 'old map'],
    reply: `Each Unified Events season introduces a fully reset Minecraft world. However, historical records indicate that memory of prior landscapes often persists within community narratives, shaping how civilizations interpret new terrain despite the absence of physical continuity.`
  },
  {
    keys: ['territory', 'land control', 'map control', 'territorial control'],
    reply: `Territorial control within Unified Events is established and contested through in-season conflict and strategic presence. Control of land is not persistent across seasons and is reset alongside each new world, ensuring each cycle begins without inherited territorial advantage.`
  },
  {
    keys: ['resource gathering', 'mining rules', 'resources', 'civilization economy', 'resource economy', 'ingame economy', 'trade system'],
    reply: `Resource gathering occurs naturally within the seasonal world. The in-season economy is informal and player-driven, centered around civilizations competing for materials through exploration, construction, and controlled territorial presence, then trading or allocating them for conflict preparation.`
  },
  {
    keys: ['server crash', 'restart', 'rollback', 'world reset bug'],
    reply: `In the event of a technical disruption such as a server crash or world instability, Unified Events administrators review logs to determine whether a rollback or corrective restoration is required. Any affected progress is reconstructed in accordance with the closest verifiable state recorded within the archive.`
  },
  {
    keys: ['unexpected event', 'admin event', 'world event', 'surprise event', 'random event', 'event happens'],
    reply: `Occasionally, administrators introduce controlled events during a season to alter environmental or strategic conditions. These occurrences are recorded as world interventions, noted separately from standard civilization-driven outcomes within the archive.`
  },
  {
    keys: ['disaster event', 'natural disaster', 'lava rise', 'meteor', 'catastrophe'],
    reply: `Certain seasons may include environmental disaster scenarios such as Rising Lava or similar world-altering conditions. These events are documented as systemic pressures that force civilizations to adapt rapidly under changing survival conditions.`
  },
 
  // ---------- MINI EVENTS ----------
  {
    keys: ['mini event', 'mini-event', 'lava', 'rising lava', 'mini event structure', 'how mini events work', 'mini event rules'],
    reply: `Beyond full civilization seasons, Unified Events communities regularly run mini-events as supplementary activities with simplified rulesets, including a Rising Lava event, Hunger Games, and game nights such as Among Us. These keep communities active between seasons and draw participation from across all six servers.`
  },
  {
    keys: ['hunger games'],
    reply: `Hunger Games is one of the most frequently run mini-events across the Unified Events ecosystem, drawing participants from all six civilization Discord communities. It serves as a popular competitive activity between full seasons.`
  },
  {
    keys: ['among us', 'game night', 'gamenight'],
    reply: `Game nights including Among Us are a regular part of the Unified Events community calendar, running across the partnered civilization servers. These events bring members from all six communities together outside of formal season competition.`
  },
  {
    keys: ['smp', 'liquids smp', 'liquids server smp', 'does liquids have smp'],
    reply: `Liquids Civilization runs their own SMP alongside their participation in Unified Events seasons. This parallel activity exists outside formal seasonal competition and makes them one of the more active servers in terms of ongoing Minecraft content.`
  },
  {
    keys: ['aether', 'atlantis', 'aether v atlantis', 'aether vs atlantis', 'most popular event', 'best event', 'favourite event'],
    reply: `The most celebrated event in Unified Events history to date is the Liquids Aether v Atlantis event, run by Liquids Civilization. It stands out as a fan favourite across the community and is frequently referenced as a high point in the archive.`
  },
 
  // ---------- THE SIX CIVILIZATIONS ----------
  {
    keys: ['how many civs', 'how many civilizations', 'list of civs', 'all civilizations', 'roster', 'all servers', 'server list again', 'list civilizations'],
    reply: `Six civilization Discord communities are currently active in the Unified Events ecosystem: Liquids Civilization (1.6k members), Oracles Events (1.2k), Prite's Events (860), Crabby's Civilization Experiments (837), Archie's Civilization Experiments (500), and Jcrimzy's Events (200).`
  },
  {
    keys: ['oracles', 'oracles identity', 'oracles culture', 'oracles personality'],
    reply: `Oracles Events is one of the larger civilization Discord servers in the Unified Events ecosystem, with around 1,200 members. They are known as a strategy-focused, analytical community — methodical, recognised for structured planning and coordinated execution during seasonal competition.`
  },
  {
    keys: ['oracles strength', 'oracles strong', 'oracles best', 'oracles win'],
    reply: `Historical records indicate that Oracles derive their competitive strength from preparation and structured coordination. Their large, active community of around 1,200 members means they can field well-organised teams and execute long-term tactical plans more reliably than smaller servers.`
  },
  {
    keys: ['oracles weakness', 'oracles lose', 'oracles bad'],
    reply: `Unconfirmed historical interpretation suggests that Oracles may struggle against highly chaotic or unpredictable opponents, where pre-planned strategy becomes harder to execute. Their structured approach is a strength in stable scenarios but can be a vulnerability when forced into improvisation.`
  },
  {
    keys: ['oracles members', 'oracles size', 'oracles server'],
    reply: `Oracles Events currently has approximately 1,200 members in their Discord server, making them the second largest civilization community in the Unified Events ecosystem.`
  },
  {
    keys: ['jcrimzy', 'jcrimzy identity', 'jcrimzy culture', 'jcrimzy personality'],
    reply: `Jcrimzy's Events is a smaller civilization Discord server with around 200 members. Despite their size, they are a recognised competitor in Unified Events, known for personality-driven leadership and adaptable, flexible strategic approaches across seasons.`
  },
  {
    keys: ['jcrimzy alliance', 'jcrimzy ally', 'jcrimzy diplomacy'],
    reply: `Archived records reflect that Jcrimzy's community has demonstrated flexibility in forming and shifting alliances across seasons. For a smaller server, diplomatic maneuvering is often their most effective tool — building coalitions to compete against larger civilization communities.`
  },
  {
    keys: ['jcrimzy members', 'jcrimzy size', 'jcrimzy server'],
    reply: `Jcrimzy's Events currently has approximately 200 members in their Discord server, making them the smallest of the six civilization communities in the Unified Events ecosystem. Their competitive record demonstrates that server size does not determine seasonal impact.`
  },
  {
    keys: ["archie's", 'archie civ', 'archie civilization', 'archie', 'archie identity', 'archie culture', 'archie personality'],
    reply: `Archie's Civilization Experiments is a mid-sized Discord server with around 500 members. They are known for direct, aggressive competitive engagement and personality-driven leadership. Their community tends to make a strong impression in seasons through bold, visible action.`
  },
  {
    keys: ['archie strength', 'archie strong', 'archie aggressive'],
    reply: `Historical records indicate that Archie's community excels in direct competitive engagement. Their 500-strong server provides a solid player base, and their culture of aggressive, personality-driven play often forces rival communities onto the back foot.`
  },
  {
    keys: ['archie members', 'archie size', 'archie server'],
    reply: `Archie's Civilization Experiments currently has approximately 500 members in their Discord server, placing them in the mid-range of civilization communities within the Unified Events ecosystem.`
  },
  {
    keys: ['prite', 'prites', 'prites identity', 'prites culture', 'prites personality'],
    reply: `Prite's Events is a mid-sized civilization Discord server with around 860 members. They are one of the more structurally consistent communities in Unified Events, known for teamwork, stability, and coordinated performance. They are not defined by flashy moments but by reliable, sustained output.`
  },
  {
    keys: ['prites team', 'prites teamwork', 'prites coordination'],
    reply: `The defining characteristic of Prite's Events community is their internal coordination. With 860 members, they have enough of a player base to field organised teams while maintaining the cohesion that makes them difficult to disrupt through targeted pressure.`
  },
  {
    keys: ['prites members', 'prites size', 'prites server'],
    reply: `Prite's Events currently has approximately 860 members in their Discord server, making them the third largest civilization community in the Unified Events ecosystem.`
  },
  {
    keys: ['liquid', 'liquids', 'liquids identity', 'liquids culture', 'liquids personality'],
    reply: `Liquids Civilization is the largest civilization Discord server in the Unified Events ecosystem, with around 1,600 members. Their community is known for unpredictable, adaptive strategies and dynamic seasonal behavior — rivals who attempt to prepare based on prior seasons frequently find Liquids operating in a completely different manner.`
  },
  {
    keys: ['liquids strategy', 'liquids tactics', 'liquids unpredictable'],
    reply: `Within archived season data, Liquids Civilization is noted for their willingness to change approach entirely between and even within seasons. With a 1,600-member community behind them, they have the depth to experiment with different strategies without the risk of being caught short on players.`
  },
  {
    keys: ['liquids members', 'liquids size', 'liquids server'],
    reply: `Liquids Civilization currently has approximately 1,600 members in their Discord server — the largest of any civilization community in the Unified Events ecosystem. Their size gives them a broad pool of active participants to draw from each season.`
  },
  {
    keys: ['liquids win season', 'liquids victory', 'liquids won', 'who wins liquids'],
    reply: `Seasonal records indicate that outcomes involving Liquids Civilization vary across individual seasons. While they frequently appear in competitive contention due to their size and adaptability, no permanent or guaranteed victory status is recorded within the Unified Events archive.`
  },
  {
    keys: ['crabby', 'crabbys identity', 'crabbys culture', 'crabbys personality'],
    reply: `Crabby's Civilization Experiments is a mid-sized Discord server with around 837 members. Their community is known for chaotic, high-energy competitive play and unconventional strategies. They may not always top the rankings but their presence consistently shapes the narrative of any season they participate in.`
  },
  {
    keys: ['crabbys chaos', 'crabbys crazy', 'crabbys unconventional'],
    reply: `Historical records reflect that Crabby's community tends to pursue strategies that prioritise disruption and entertainment alongside competitive output. With 837 members, they have the numbers to cause genuine problems for even the most structured opponents.`
  },
  {
    keys: ['crabbys members', 'crabbys size', 'crabbys server'],
    reply: `Crabby's Civilization Experiments currently has approximately 837 members in their Discord server, placing them alongside Prite's Events in the mid-range of civilization communities within the Unified Events ecosystem.`
  },
 
  // ---------- SIZE / COMPARISONS ----------
  {
    keys: ['biggest server', 'largest server', 'most members', 'biggest civ'],
    reply: `By member count, Liquids Civilization is the largest community in the Unified Events ecosystem with approximately 1,600 members, followed by Oracles Events at 1,200 members. The full ranking is: Liquids (1.6k), Oracles (1.2k), Prite's Events (860), Crabby's Civilization Experiments (837), Archie's Civilization Experiments (500), and Jcrimzy's Events (200).`
  },
  {
    keys: ['smallest server', 'fewest members', 'smallest civ'],
    reply: `By member count, Jcrimzy's Events is the smallest civilization community in the Unified Events ecosystem with approximately 200 members. However, server size does not determine seasonal performance — smaller communities have historically punched above their weight through strong coordination and diplomacy.`
  },
  {
    keys: ['member count', 'how many members', 'server size', 'all servers member count'],
    reply: `Current civilization Discord server member counts within the Unified Events ecosystem: Liquids Civilization — 1,600, Oracles Events — 1,200, Prite's Events — 860, Crabby's Civilization Experiments — 837, Archie's Civilization Experiments — 500, Jcrimzy's Events — 200.`
  },
  {
    keys: ['liquids vs crabbys', 'crabbys vs liquids'],
    reply: `A matchup between Liquids Civilization and Crabby's would pit the largest community (1,600 members) against one of the most chaotic. Liquids' size advantage is real, but Crabby's unpredictable approach historically makes them difficult to prepare for regardless of opponent size.`
  },
  {
    keys: ['prites vs oracles', 'oracles vs prites'],
    reply: `A Prite's Events vs Oracles matchup would be a battle of coordination versus strategy. Oracles (1,200 members) have a slight size advantage over Prite's (860 members), but Prite's structured teamwork has historically made them competitive against larger communities.`
  },
  {
    keys: ['compare', 'versus', ' vs ', 'server comparison again', 'which civ is best', 'compare civs'],
    reply: `The Unified Events ecosystem contains six civilization Discord servers: Liquids Civilization (1.6k members), Oracles Events (1.2k), Prite's Events (860), Crabby's Civilization Experiments (837), Archie's Civilization Experiments (500), and Jcrimzy's Events (200). Specify which two you would like compared, or ask about a specific matchup.`
  },
  {
    keys: ['strongest', 'best civilization', 'most dominant', 'most powerful', 'greatest civ', 'legendary civ', 'most successful civ', 'dominant civ history', 'best civ ever', 'strongest civ ever', 'most dominant civ all time'],
    reply: `Historical records do not definitively crown a single most dominant civilization community, and no civilization maintains permanent supremacy. Liquids hold the largest member base at 1,600, Oracles are recognised for strategic consistency, and Prite's Events for coordinated reliability. Dominance in Unified Events tends to be seasonal and contextual rather than permanent.`
  },
 
  // ---------- SERVER CONTENT / FORMAT ----------
  {
    keys: ['what does each server do', 'what do the servers do', 'server content', 'what happens in'],
    reply: `All six civilization Discord communities within Unified Events are centred around Minecraft civilization gameplay, covering building, fighting, and diplomacy. Beyond full seasons, they regularly run mini-events including Rising Lava, Hunger Games, and game nights. Liquids Civilization additionally runs their own SMP. All six servers are formally partnered and maintain a friendly relationship across the community.`
  },
  {
    keys: ['building', 'warfare', 'fight', 'focus'],
    reply: `All six civilization communities within the Unified Events ecosystem share a focus on the three core pillars of civilization gameplay: building, fighting, and diplomacy. No single server is exclusively dedicated to one aspect — all three are central to how seasons and events play out across the platform.`
  },
  {
    keys: ['roleplay', 'rp', 'is it roleplay'],
    reply: `Unified Events contains structured civilization gameplay with narrative elements emerging from player interaction, diplomacy, and conflict, though outcomes are based on recorded events rather than scripted roleplay.`
  },
  {
    keys: ['how to join a season', 'how do servers join', 'sign up season'],
    reply: `Unified Events seasons are collaborative merged events rather than server vs server competitions. Each of the six partnered civilization communities contributes members, and players participate together across civs within the shared event. Think of it less as one server beating another and more as a large collaborative civilization event drawing from all partnered communities.`
  },
 
  // ---------- NOTABLE PLAYERS ----------
  {
    keys: ['notable player', 'famous player', 'known player', 'well known', 'who is famous', 'top player'],
    reply: `The Unified Events ecosystem includes several well-known competitive players. Wingsless is ranked in the top 300 Minecraft players in the world. Freekee is ranked top 14 in the world. A group known as Hzel's Group — including Hzel, WalkerTheMan, Civic, pigp0p, rmvu, and HOB25 — are recognised for having won every event they have participated in. Nation leaders including Obama8694, CageyCircle, and ImLiquidMC are also prominent figures across the community, alongside many others including Cheeseman, Neit, Serverus, and Nox.`
  },
  {
    keys: ['wingsless', 'who is wingsless', 'wingsless info', 'wingsless player'],
    reply: `Wingsless is one of the most recognised competitive players in the Unified Events ecosystem, ranked in the top 300 Minecraft players in the world. Their presence across events is noted in the archive as a significant competitive factor.`
  },
  {
    keys: ['freekee', 'freekee info', 'who is freekee', 'freekee player'],
    reply: `Freekee is among the highest-ranked competitive players in the Unified Events ecosystem, currently ranked top 14 in the world in Minecraft. Their participation in events is considered a notable competitive presence within the archive.`
  },
  {
    keys: ["hzel's group", 'hzel', 'walkertheman', 'civic', 'pigp0p', 'rmvu', 'hob25', 'hzel group again', 'who is hzel group', 'hzel team'],
    reply: `Hzel's Group is a well-known collective within the Unified Events ecosystem, comprising players including Hzel, WalkerTheMan, Civic, pigp0p, rmvu, and HOB25. They are recognised across the community for having won every event they have participated in — a record that places them among the most successful competitive groups in the archive.`
  },
  {
    keys: ['obama8694', 'cageycircle', 'imliquidmc'],
    reply: `Obama8694, CageyCircle, and ImLiquidMC are among the prominent nation leaders documented in the Unified Events archive. Nation leaders play a central role in shaping the diplomatic and competitive direction of their civilizations within each season.`
  },
  {
    keys: ['cheeseman', 'neit', 'serverus', 'nox'],
    reply: `Cheeseman, Neit, Serverus, and Nox are among the many recognised figures within the Unified Events community. The ecosystem includes a large number of well-known players across all six partnered servers, with the archive noting many more beyond those most frequently cited.`
  },
 
];

const fallback = "I don't know that one yet 😭";

function getResponse(text) {
  const lower = text.toLowerCase();

  let best = null;
  let bestScore = 0;

  for (const entry of responses) {
    let score = 0;

    for (const key of entry.keys || []) {
      if (lower.includes(key.toLowerCase())) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best?.reply || fallback;
}

module.exports = { getResponse };
