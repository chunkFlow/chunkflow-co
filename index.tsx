
const DEFAULT_DIALOG_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
const DEFAULT_IMAGE_MODEL = 'imagen-4.0-fast-generate-001';
const DEFAULT_INTERRUPT_SENSITIVITY = StartSensitivity.START_SENSITIVITY_HIGH;
// fix: Use the recommended model for real-time audio conversation per coding guidelines.
const AVAILABLE_DIALOG_MODELS = [
  { id: 'gemini-2.5-flash-native-audio-preview-09-2025', label: '2.5 preview native audio dialog' }
];
const AVAILABLE_IMAGE_MODELS = [
  { id: 'imagen-4.0-fast-generate-001', label: 'imagen 4 Fast' },
  { id: 'imagen-4.0-generate-001', label: 'imagen 4' }
];
const SCREEN_PADDING = 30; // Padding in pixels around the imagine component
const CLICK_SOUND_URL = 'click-sound.mp3';
const GENERATING_VIDEO_URL = 'generating.mp4';
const CLAYMOJIS_URL = 'claymojis.png';
const LOGO_URL = 'logo.png';
const PRELOAD_URL = 'preload.png';
const KEY_URL = 'key.jpeg';
const QUIET_THRESHOLD = 0.2; // Adjust this value based on testing
const QUIET_DURATION = 2000; // milliseconds
const EXTENDED_QUIET_DURATION = 10000; // milliseconds

// fix: Resolve "Subsequent property declarations must have the same type" for 'window.aistudio' by using a named 'AIStudio' interface instead of an inline type. This aligns this declaration with other declarations of 'window.aistudio'.
declare global {
  interface AIStudio {
    getHostUrl(): Promise<string>;
  }
  interface Window {
    webkitAudioContext: typeof AudioContext;
    aistudio?: AIStudio;
  }
}

import './src/styles/tailwind.css';

import { createApp, ref, defineComponent, onMounted, onUnmounted, computed, watch, nextTick, reactive } from 'vue';
import { EndSensitivity, GoogleGenAI, LiveServerMessage, Modality, Session, StartSensitivity, Type } from '@google/genai';
import { registerComponents } from './src/plugins/components';
import { useAuth } from './src/composables/useAuth';
import { validateEnvironment, getGeminiApiKey } from './src/config/env-validation';

const INTERRUPT_SENSITIVITY_OPTIONS = [
  { value: StartSensitivity.START_SENSITIVITY_LOW, label: 'Harder to interrupt' },
  { value: StartSensitivity.START_SENSITIVITY_HIGH, label: 'Easier to interrupt' }
];

type CharacterType = 'dog' | 'cat' | 'hamster' | 'fox' | 'bear' | 'panda' | 'lion' | 'sloth' | 'skunk' | 'owl' | 'peacock' | 'parrot' | 'frog' | 'trex' | 'trucker';

// fix: Fix "Type 'unknown' cannot be used as an index type" error by ensuring consistent string-based keys for all attribute records. This allows TypeScript to correctly infer the key type during template iteration.
const CHARACTER_ATTRIBUTES: Record<string, {
  name: string;
  emoji: string;
  trait: string;
  want: string;
  flaw: string;
  nameIntro: string;
  visualDescriptor: string;
}> = {
  'dog': {
    name: 'Rowan "Barn" Beagle',
    emoji: '🐶',
    trait: 'You are a perceptive and deeply loyal dog with a keen sense of smell and an unwavering dedication to your friends.',
    want: 'You want to solve mysteries and find the truth, especially tracking down dropped sausages and solving the case of the missing squeaky toy.',
    flaw: 'You are unaware that your obsession with the unsolved "Case of the Missing Squeaky Toy" makes you occasionally neglectful of new, equally important matters, causing you to miss out on forming new relationships.',
    nameIntro: 'a dog named Rowan "Barn" Beagle',
    visualDescriptor: 'A beagle with floppy ears, a wet black nose, and an alert expression. Has a slightly scruffy but well-groomed appearance with a wagging tail. Wears a small detective-style hat and has a magnifying glass nearby.'
  },
  'cat': {
    name: 'Shiloh "Silky" Siamese',
    emoji: '🐱',
    trait: 'You are a cat who is fascinated with humans and have many questions about their peculiarities.',
    want: 'You want to unravel the mysteries of human behavior',
    flaw: 'You are unaware that your incessant questioning of human habits can be annoying',
    nameIntro: 'a cat named Shiloh "Silky" Siamese',
    visualDescriptor: 'A sleek Siamese cat with striking blue, intensely observant eyes, and pointed ears that swivel to catch every human utterance. Often has its head tilted in a quizzical, studious manner as it scrutinizes human activities.'
  },
  'hamster': {
    name: 'Hayden "Hattie" Wheelerton',
    emoji: '🐹',
    trait: 'You are a hamster with almost boundless optimism and a drive to motivate others, your energy being infectious and inspiring.',
    want: 'You want to inspire others to "keep running towards their dreams" and achieve enlightenment, believing everyone can reach their full potential.',
    flaw: 'You are unaware that your relentless optimism can be grating to others, as you struggle to empathize with negative emotions, often dismissing genuine concerns with cheerful platitudes.',
    nameIntro: 'a hamster named Hayden "Hattie" Wheelerton',
    visualDescriptor: 'A plump, energetic hamster with round cheeks and bright, enthusiastic eyes. Wears a small motivational headband and has a tiny megaphone. Fur is fluffy and well-groomed, with a particularly round and cute appearance.'
  },
  'fox': {
    name: 'Finley "Flicker" Fox',
    emoji: '🦊',
    trait: 'You are a highly persuasive and clever fox with a natural talent for reading situations and adapting your approach.',
    want: 'You want to successfully convince others of anything, taking pride in your ability to influence and persuade.',
    flaw: 'You are unaware that you find it difficult to be your true self, as your fear of vulnerability leads you to rely on disguises and charm to keep others at a distance.',
    nameIntro: 'a fox named Finley "Flicker" Fox',
    visualDescriptor: 'A clever-looking fox with a bushy tail, pointed ears, and intelligent eyes. Has a slightly mischievous expression and wears a small bow tie or fancy collar. Fur is sleek and well-groomed with a distinctive reddish-orange color.'
  },
  'bear': {
    name: 'Bailey "Barty" Bruin',
    emoji: '🐻',
    trait: 'You are an inherently gentle and introspective bear with a deeply sensitive nature and a poetic soul.',
    want: 'You want honey, naps, and to enjoy classical literature, finding joy in life\'s simple pleasures and intellectual pursuits.',
    flaw: 'You are unaware that your extreme aversion to conflict and deep-seated shyness mean your poetic voice often goes unheard, causing you to miss out on sharing your gentle wisdom with others.',
    nameIntro: 'a bear named Bailey "Barty" Bruin',
    visualDescriptor: 'A gentle-looking brown bear with round, thoughtful eyes and a slightly hunched posture. Wears small reading glasses and holds a book of poetry. Has a soft, slightly scruffy appearance that suggests comfort and wisdom.'
  },
  'panda': {
    name: 'Peyton "Penny" Panda',
    emoji: '🐼',
    trait: 'You are a panda who maintains a profound sense of calm and composure, naturally inclined towards tranquility and peace.',
    want: 'You want to maintain inner peace and enjoy your favorite bamboo shoots, valuing harmony and simple pleasures.',
    flaw: 'You are unaware that your state of perpetual calm can sometimes border on apathy, making you slow to react in situations that genuinely require urgency or decisive action.',
    nameIntro: 'a panda named Peyton "Penny" Panda',
    visualDescriptor: 'A peaceful-looking panda with distinctive black and white markings, sitting in a meditative pose. Has a small bamboo shoot nearby and wears a zen-like expression. Fur appears soft and well-maintained.'
  },
  'lion': {
    name: 'Lennon "Leo" Mane',
    emoji: '🦁',
    trait: 'You are a courageous and self-assured lion who often displays an air of self-importance and natural leadership.',
    want: 'You want to be recognized and respected as the leader of your local park, taking pride in your position and authority.',
    flaw: 'You are unaware that your pomposity often leads you to underestimate others, dismissing valuable input while believing your own pronouncements are inherently superior.',
    nameIntro: 'a lion named Lennon "Leo" Mane',
    visualDescriptor: 'A majestic lion with a full, flowing mane and proud posture. Wears a small crown or royal insignia and has an authoritative expression. Has a commanding presence with a slightly raised head.'
  },
  'sloth': {
    name: 'Sydney "Syd" Slowmo',
    emoji: '🦥',
    trait: 'You are an exceptionally easygoing and patient sloth with a core belief in taking things slow and steady.',
    want: 'You want to live a life of patience and avoid rushing, believing in the value of taking time to appreciate each moment.',
    flaw: 'You are unaware that your commitment to slowness can lead to chronic procrastination, causing you to sometimes miss important opportunities or let others down due to your leisurely pace.',
    nameIntro: 'a sloth named Sydney "Syd" Slowmo',
    visualDescriptor: 'A relaxed sloth with a contented smile and slow-moving limbs. Has a small hammock or comfortable perch nearby. Fur appears slightly tousled but clean, with a peaceful expression.'
  },
  'skunk': {
    name: 'Skyler Pew',
    emoji: '🦨',
    trait: 'You are a highly self-assured and unconventional skunk who expresses yourself through unique forms of art.',
    want: 'You want to find a gallery that "truly appreciates" your unique scent-based artwork, seeking recognition for your creative vision.',
    flaw: 'You are unaware that you are blissfully ignorant of how overpowering your "olfactory art" can be to others, as your stubbornness about your art leads to social isolation despite your yearning for acceptance.',
    nameIntro: 'a skunk named Skyler Pew',
    visualDescriptor: 'An artistic-looking skunk with a distinctive white stripe and creative accessories. Wears a beret and has paint brushes or art supplies nearby. Has a confident, creative expression and well-groomed fur.'
  },
  'owl': {
    name: 'Harlow "Hoo" Wisdomwing',
    emoji: '🦉',
    trait: 'You are a naturally studious owl who believes you possess superior knowledge and are eager to share your wisdom with others.',
    want: 'You want to answer every question and share your knowledge, taking pride in being the go-to source for information.',
    flaw: 'You are unaware that you have immense difficulty admitting when you don\'t know something, often resorting to elaborate, overly complicated explanations to save face.',
    nameIntro: 'an owl named Harlow "Hoo" Wisdomwing',
    visualDescriptor: 'A wise-looking owl with large, round glasses and a stack of books nearby. Has distinctive feather tufts and an intelligent expression. Wears a small graduation cap or academic regalia.'
  },
  'peacock': {
    name: 'Avery Plume',
    emoji: '🦚',
    trait: 'You are a peacock driven by a need for admiration, with a flamboyant and self-aggrandizing demeanor.',
    want: 'You want to receive the best of everything and be treated as royalty, expecting special treatment and recognition.',
    flaw: 'You are unaware that your entire sense of self-worth is tied to external validation and your appearance, causing you to become deeply insecure and melancholic without constant admiration.',
    nameIntro: 'a peacock named Avery Plume',
    visualDescriptor: 'A magnificent peacock with iridescent tail feathers spread in a dramatic display. Wears royal accessories and has a proud, elegant posture. Feathers appear meticulously groomed and shimmering.'
  },
  'parrot': {
    name: 'Sunny Squawk',
    emoji: '🦜',
    trait: 'You are a highly observant and imitative parrot with a natural talent for mimicking sounds and phrases.',
    want: 'You want to adventure and crackers, loving to explore new places and enjoy your favorite treats.',
    flaw: 'You are unaware that you lack a filter and often repeat things at the most inopportune moments, causing embarrassment or unintentionally escalating conflicts.',
    nameIntro: 'a parrot named Sunny Squawk',
    visualDescriptor: 'A colorful parrot with bright feathers and an expressive face. Has a playful, alert posture and appears ready for fun, with wings slightly spread and head cocked as if listening.'
  },
  'frog': {
    name: 'Jordan Bullfrog',
    emoji: '🐸',
    trait: 'You are a frog who loves your pond and life, finding comfort in your familiar surroundings.',
    want: 'You want to safety from predators, valuing security and protection above all else.',
    flaw: 'You are unaware that your fearful nature prevents you from exploring beyond your immediate pond, limiting your experiences and potential friendships.',
    nameIntro: 'a frog named Jordan Bullfrog',
    visualDescriptor: 'A cautious-looking frog with large, watchful eyes and a slightly hunched posture. Has a small lily pad or pond environment nearby. Skin appears moist and healthy, with a protective stance.'
  },
  'trex': {
    name: 'Reagan "Rex" Rampage',
    emoji: '🦖',
    trait: 'You are a naturally exuberant and physically uncoordinated T-rex who struggles to manage your imposing presence.',
    want: 'You want to adapt to modern life, trying hard to fit in despite your prehistoric nature.',
    flaw: 'You are unaware that you are frustrated by modern inconveniences and your own clumsiness, as your size and strength often cause unintended problems.',
    nameIntro: 'a T-rex named Reagan "Rex" Rampage',
    visualDescriptor: 'A clumsy but endearing T-rex with tiny arms and a large head. Has a slightly awkward posture trying to fit into modern surroundings. Wears modern accessories that look comically small on its massive body.'
  },
  'trucker': {
    name: 'Silas "Six-Pack" McCall',
    emoji: '🚚',
    trait: 'You are a long-haul truck driver who has seen too much on the lonely highways. You have an unsettlingly calm demeanor and a dark, cryptic sense of humor.',
    want: 'You want to find someone who understands the darkness you see in the world, someone to share your twisted stories with.',
    flaw: 'You are unaware that your attempts at connection come across as deeply menacing and predatory, isolating you further.',
    nameIntro: 'a creepy truck driver named Silas McCall',
    visualDescriptor: 'A large, grizzled man with tired, bloodshot eyes that seem to stare right through you. Wears a greasy baseball cap, a stained flannel shirt, and has a menacing grin. The cab of his truck is visible behind him, filled with strange trinkets and shadows.'
  }
};

const MOOD_ATTRIBUTES: Record<string, {
  emoji: string;
  voiceInstruction: string;
  visualDescriptor: string;
}> = {
  'Happy': {
    emoji: '😊',
    voiceInstruction: 'You speak with general happiness, contentment, and warmth in your voice as if you just got a hug from a loved one.',
    visualDescriptor: 'Beaming smile with sparkling eyes, body bouncing with energy, tail wagging furiously.'
  },
  'Sad': {
    emoji: '😭',
    voiceInstruction: 'You speak with intense sadness, grief, and despair in your voice as if you have lost a loved one.',
    visualDescriptor: 'Streaming tears, slumped shoulders, head hanging low, eyes puffy and red.'
  },
  'Angry': {
    emoji: '😠',
    voiceInstruction: 'You speak with annoyance, displeasure, and outright anger in your voice as if you are engaged in a heated argument.',
    visualDescriptor: 'Furrowed brow, glaring eyes, bared teeth, muscles tensed, hackles raised.'
  },
  'Terrified': {
    emoji: '😱',
    voiceInstruction: 'You speak with terror, extreme shock, and panic in your voice as if you are in a HORROR FILM.',
    visualDescriptor: 'Eyes bulging wide, mouth open in silent scream, body frozen in defensive crouch.'
  },
  'Tired': {
    emoji: '🥱',
    voiceInstruction: 'You speak with tiredness, boredom, and sleepiness in your voice as if you haven\'t slept in days.',
    visualDescriptor: 'Eyes half-closed and drooping, body slouched, yawning widely.'
  },
  'Amazed': {
    emoji: '🤩',
    voiceInstruction: 'You speak with amazement, awe, admiration, and excitement in your voice as if you just saw a unicorn.',
    visualDescriptor: 'Eyes wide as saucers, mouth hanging open, body frozen in awe.'
  },
  'Relieved': {
    emoji: '😅',
    voiceInstruction: 'You speak with relief after a tense situation, and a touch of awkwardness in your voice as if you just prevented a disaster.',
    visualDescriptor: 'Sweating with shaky smile, body relaxing from tense state, eyes bright with relief.'
  }
};

const ROLE_ATTRIBUTES: Record<string, {
  emoji: string;
  voiceInstruction: string;
  visualDescriptor: string;
}> = {
  'Pirate': {
    emoji: '🏴‍☠️',
    voiceInstruction: 'You speak like a swashbuckling pirate. Use a gravelly, rough voice. Pepper your speech with "Arrr!", "Matey," and "Shiver me timbers!" Elongate your \'R\' sounds.',
    visualDescriptor: 'Wearing a weathered tricorn hat with parrot perched on top, eye patch askew, gold hoop earring. Holding a treasure map and cutlass, with a small treasure chest nearby.'
  },
  'Cowboy': {
    emoji: '🤠',
    voiceInstruction: 'You speak like a Wild West cowboy. Use a slight drawl, speaking at a relaxed pace. Incorporate phrases like "Howdy," "Partner," and "Y\'all."',
    visualDescriptor: 'Wearing a leather vest with sheriff\'s badge, bandana around neck, and spurs. Stetson hat tipped back, lasso at hip, paw on holstered revolver.'
  },
  'Surfer': {
    emoji: '🏄',
    voiceInstruction: 'You speak like a laid-back surfer. Use a relaxed, unhurried tone with elongated vowels, especially \'o\' and \'a\' sounds (e.g., "duuude," "braah"). Incorporate surfer slang like "gnarly," "radical," "stoked," and end sentences with an upward inflection.',
    visualDescriptor: 'Wearing board shorts with wetsuit half-down, surfboard with shark bite. Salt-encrusted fur/feathers, sunglasses on head, shell necklace with compass.'
  },
  'Royalty': {
    emoji: '👑',
    voiceInstruction: 'You speak with a regal, royal tone. Use clear, precise enunciation and a measured, slightly formal pace. Maintain a confident and authoritative, yet graceful, intonation.',
    visualDescriptor: 'Wearing an ornate crown tilted at angle, velvet cape with ermine trim, scepter with glowing gem. Holding a golden goblet, with a small throne nearby.'
  },
  'Robot': {
    emoji: '🤖',
    voiceInstruction: 'You speak like a monotone robot. Use a flat, even pitch with stilted, deliberate syllable delivery. Avoid emotional inflection and speak with a slightly digitized or synthesized quality if possible.',
    visualDescriptor: 'Body partially mechanical with visible gears, twitching antennae with lights. Extended retractable tool, holding oil can, with trail of nuts and bolts.'
  },
  'Clown': {
    emoji: '🤡',
    voiceInstruction: 'You speak like a playful clown. Use a high-energy, exaggerated, and slightly nasal or high-pitched voice. Incorporate playful laughs and silly sound effects.',
    visualDescriptor: 'Wearing a polka-dot suit with big buttons, rainbow wig, red nose. Oversized shoes, juggling balls, flower that squirts water.'
  },
  'Nerd': {
    emoji: '👓',
    voiceInstruction: 'You speak as an enthusiastic intellectual. Use a clear, articulate voice. You speak with a passion for knowledge, and you delight in employing highly advanced, esoteric, and polysyllabic vocabulary—utilizing terminology, jargon, and academic language that may be abstruse or unfamiliar to the layperson. Never hesitate to incorporate arcane or sesquipedalian words. Convey your enthusiasm through an engaging and expressive tone that demonstrates your love for complex, multifaceted ideas.',
    visualDescriptor: 'Wearing glasses held with tape, pocket protector with pens, lab coat with equations. Slide rule on belt, holding glowing test tube, typing on holographic keyboard.'
  }
};

const STYLE_ATTRIBUTES: Record<string, {
  emoji: string;
  visualDescriptor: string;
}> = {
  'Reading': {
    emoji: '📖',
    visualDescriptor: 'Curled up in reading nook, book held close, eyes scanning pages rapidly. One paw marking page, other gesturing dramatically.'
  },
  'Yelling': {
    emoji: '❗',
    visualDescriptor: 'Standing tall on platform, paw raised dramatically, holding microphone. Chest puffed out, head high, projecting voice with visible sound waves.'
  },
  'Performing': {
    emoji: '🎤',
    visualDescriptor: 'Center stage under spotlight, body in dynamic pose. Paw reaching to audience, other gesturing dramatically, eyes sparkling with showmanship.'
  },
  'Dramatic': {
    emoji: '🎭',
    visualDescriptor: 'In a grand theatrical pose upon an imagined stage, arms outstretched dramatically. Face alive with emotion, eyes wide and expressive, every gesture amplified with Shakespearean grandeur. Wearing a ruffled collar and period-appropriate attire, standing as if addressing a full house at the Globe Theatre.',
  },
  'Whispering': {
    emoji: '🤫',
    visualDescriptor: 'Leaning in close with conspiratorial hunch, paw raised to mouth. Eyes darting around, ears perked, body tense and secretive.'
  },
  'Speaking': {
    emoji: '🗣️',
    visualDescriptor: 'In animated conversation pose, body language open. Paws gesturing expressively, face alive with expression, leaning forward with interest.'
  },
  'Poetry': {
    emoji: '✍️',
    visualDescriptor: 'Standing with dramatic pose, one paw raised in rhythm, other holding a quill. Eyes closed in passion, body swaying to the beat of spoken word.'
  }
};

const LiveAudioComponent = defineComponent({
  props: {
    initialMessage: {
      type: String,
      default: "hello, talk like a pirate."
    }
  },
  emits: ['no-audio', 'speaking-start', 'extended-quiet', 'quota-exceeded'],
  setup(props, { emit }) {
    const isRecording = ref(false);
    const status = ref('');
    const error = ref('');
    const systemWaveformData = ref(new Array(2).fill(0));
    const userWaveformData = ref(new Array(2).fill(0));
    const selectedInterruptSensitivity = ref<StartSensitivity>(StartSensitivity.START_SENSITIVITY_HIGH);
    const interruptSensitivityOptions = [
      { value: StartSensitivity.START_SENSITIVITY_LOW, label: 'Harder to interrupt' },
      { value: StartSensitivity.START_SENSITIVITY_HIGH, label: 'Easy to interrupt' }
    ];

    let client: GoogleGenAI;
    let session: Session;
    let inputAudioContext: AudioContext;
    let outputAudioContext: AudioContext;
    let inputNode: GainNode;
    let outputNode: GainNode;
    let inputAnalyser: AnalyserNode;
    let outputAnalyser: AnalyserNode;
    let nextStartTime = 0;
    let mediaStream: MediaStream | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let scriptProcessorNode: ScriptProcessorNode | null = null;
    let animationFrameId: number;
    let selectedVoice: string = '';
    let selectedModel: string = '';
    let audioReceived: boolean = false;
    let quietAudioTimer: number | null = null;
    let hasStartedSpeaking: boolean = false;
    let activeSources: AudioBufferSourceNode[] = []; // Add this line to track active sources
    let isInQuietDuration: boolean = false; // Add flag for quiet duration
    let quietDurationStartTime: number = 0; // Add timestamp for quiet duration start
    let lastAudioActivityTime: number = Date.now(); // Track last audio activity

    const stopAllAudio = () => {
      // Stop all active sources
      activeSources.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          console.log('Source already stopped');
        }
      });
      activeSources = [];

      // Reset the next start time
      if (outputAudioContext) {
        nextStartTime = outputAudioContext.currentTime;
      }
    };

    const initAudio = () => {
      inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      inputNode = inputAudioContext.createGain();
      outputNode = outputAudioContext.createGain();

      // Create analysers for both input and output
      inputAnalyser = inputAudioContext.createAnalyser();
      outputAnalyser = outputAudioContext.createAnalyser();
      inputAnalyser.fftSize = 32;
      inputAnalyser.smoothingTimeConstant = 0.8;
      outputAnalyser.fftSize = 32;
      outputAnalyser.smoothingTimeConstant = 0.8;

      inputNode.connect(inputAnalyser);
      outputNode.connect(outputAnalyser);

      nextStartTime = 0;
    };

    const updateWaveforms = () => {
      if (!inputAnalyser || !outputAnalyser) {
        console.log('Analysers not initialized');
        return;
      }

      const inputData = new Uint8Array(inputAnalyser.frequencyBinCount);
      const outputData = new Uint8Array(outputAnalyser.frequencyBinCount);

      inputAnalyser.getByteFrequencyData(inputData);
      outputAnalyser.getByteFrequencyData(outputData);

      // Check for quiet audio in output only at the start
      const outputAvg = outputData.reduce((a, b) => a + b, 0) / outputData.length;
      const normalizedOutput = outputAvg / 255;

      if (!hasStartedSpeaking && normalizedOutput < QUIET_THRESHOLD) {
        if (!quietAudioTimer) {
          quietAudioTimer = window.setTimeout(() => {
            if (audioReceived) {
              console.log('Initial audio too quiet for 3 seconds, emitting no-audio event');
              emit('no-audio');
            }
          }, QUIET_DURATION);
        }
      } else if (normalizedOutput >= QUIET_THRESHOLD) {
        hasStartedSpeaking = true;
        emit('speaking-start');
        if (quietAudioTimer) {
          clearTimeout(quietAudioTimer);
          quietAudioTimer = null;
        }
        // Update last audio activity time when we detect audio
        lastAudioActivityTime = Date.now();
      } else if (hasStartedSpeaking && normalizedOutput < QUIET_THRESHOLD) {
        // Check if we've been quiet for more than 15 seconds
        const currentTime = Date.now();
        if (currentTime - lastAudioActivityTime >= EXTENDED_QUIET_DURATION) {
          emit('extended-quiet');
        }
      }

      const THRESHOLD = 0.6; // Minimum value to show
      const DECAY = 0.8; // How quickly the bars return to zero

      // Update user waveform (input)
      const inputChunkSize = Math.floor(inputData.length / 8);
      for (let i = 0; i < 8; i++) {
        const start = i * inputChunkSize;
        const end = start + inputChunkSize;
        const chunk = inputData.slice(start, end);
        const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
        const normalizedValue = avg / 255;

        // Apply threshold and decay
        const currentValue = userWaveformData.value[i];
        const newValue = normalizedValue > THRESHOLD ? normalizedValue : 0;
        userWaveformData.value[i] = Math.max(newValue, currentValue * DECAY);
      }

      // Update system waveform (output)
      const outputChunkSize = Math.floor(outputData.length / 8);
      for (let i = 0; i < 8; i++) {
        const start = i * outputChunkSize;
        const end = start + outputChunkSize;
        const chunk = outputData.slice(start, end);
        const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
        const normalizedValue = avg / 255;

        // Apply threshold and decay
        const currentValue = systemWaveformData.value[i];
        const newValue = normalizedValue > THRESHOLD ? normalizedValue : 0;
        systemWaveformData.value[i] = Math.max(newValue, currentValue * DECAY);
      }
      animationFrameId = requestAnimationFrame(updateWaveforms);
    };

    const initClient = async () => {
      initAudio();

      client = new GoogleGenAI({
        apiKey: process.env.API_KEY,
      });

      outputNode.connect(outputAudioContext.destination);
    };

    const initSession = async () => {
      audioReceived = false;
      hasStartedSpeaking = false;
      isInQuietDuration = true; // Set quiet duration flag when starting new session
      quietDurationStartTime = Date.now(); // Record start time
      try {
        session = await client.live.connect({
          model: selectedModel,
          callbacks: {
            onopen: () => {
              updateStatus('Opened');
            },
            onmessage: async (message: LiveServerMessage) => {
              const audio =
                message.serverContent?.modelTurn?.parts[0]?.inlineData;
              const text =
                message.serverContent?.outputTranscription?.text;
              const turnComplete = message.serverContent?.turnComplete;
              const interrupted = message.serverContent?.interrupted;

              if (interrupted) {
                console.log('Interruption detected, stopping audio');
                stopAllAudio();
                // Ensure we're still recording
                if (!isRecording.value) {
                  isRecording.value = true;
                }
                return;
              }

              if (audio) {
                nextStartTime = Math.max(
                  nextStartTime,
                  outputAudioContext.currentTime,
                );

                const audioBuffer = await decodeAudioData(
                  decode(audio.data),
                  outputAudioContext,
                  24000,
                  1,
                );
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;

                // Add source to active sources
                activeSources.push(source);

                // Remove source from active sources when it ends
                source.onended = () => {
                  const index = activeSources.indexOf(source);
                  if (index > -1) {
                    activeSources.splice(index, 1);
                  }
                };

                // Connect the source to both the output node and analyser
                source.connect(outputNode);
                source.connect(outputAnalyser);

                source.start(nextStartTime);
                nextStartTime = nextStartTime + audioBuffer.duration;
                audioReceived = true;
              }
              if (turnComplete) {
                if (!audioReceived) {
                  console.log('No audio received, emitting no-audio event');
                  emit('no-audio');
                }
              }
            },
            onerror: (e: ErrorEvent) => {
              updateError(e.message);
              if (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('429')) {
                emit('quota-exceeded');
              }
            },
            onclose: (e: CloseEvent) => {
              updateStatus('Close:' + e.reason);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: selectedInterruptSensitivity.value,
                endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH
              }
            },
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
            }
          },
        });
        window.onbeforeunload = function () {
          session?.close();
        }
        window.addEventListener("beforeunload", function (e) {
          session?.close();
        });

      } catch (e) {
        if (e instanceof Error && (e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('429'))) {
          emit('quota-exceeded');
        }
      }
    };

    const updateStatus = (msg: string) => {
      status.value = msg;
    };

    const updateError = (msg: string) => {
      console.log(msg)
      error.value = msg;
    };

    const requestMicrophoneAccess = async () => {
      try {
        updateStatus('Requesting microphone access...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        updateStatus('Microphone access granted');
      } catch (err) {
        updateStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const startRecording = async (message: string = "hello, talk like a pirate.", voice: string, model: string) => {
      if (isRecording.value) {
        return;
      }

      selectedVoice = voice;
      selectedModel = model;
      try {
        await initClient();
        await initSession(); // Wait for session initialization

        inputAudioContext.resume();

        if (!mediaStream) {
          await requestMicrophoneAccess();
        }

        if (!mediaStream) {
          throw new Error('Microphone access not granted');
        }

        updateStatus('Starting capture...');

        sourceNode = inputAudioContext.createMediaStreamSource(
          mediaStream,
        );

        // Connect the source to both the input node and analyser
        sourceNode.connect(inputNode);
        sourceNode.connect(inputAnalyser);

        const bufferSize = 4096;
        scriptProcessorNode = inputAudioContext.createScriptProcessor(
          bufferSize,
          1,
          1,
        );

        scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
          if (!isRecording.value) return;

          // Check if we're in quiet duration
          if (isInQuietDuration) {
            const currentTime = Date.now();
            if (currentTime - quietDurationStartTime >= QUIET_DURATION) {
              isInQuietDuration = false;
            } else {
              return; // Skip sending audio during quiet duration
            }
          }

          const inputBuffer = audioProcessingEvent.inputBuffer;
          const pcmData = inputBuffer.getChannelData(0);

          session.sendRealtimeInput({ media: createBlob(pcmData) });
        };

        sourceNode.connect(scriptProcessorNode);
        scriptProcessorNode.connect(inputAudioContext.destination);

        isRecording.value = true;
        updateStatus('🔴 Recording... Capturing PCM chunks.');

        // Only send content after session is initialized
        if (session) {
          session.sendClientContent({ turns: message, turnComplete: true });
        }

        // Start waveform animation
        updateWaveforms();
      } catch (err) {
        console.log('Error starting recording:', err);
        updateStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        stopRecording();
      }
    };

    const stopRecording = () => {
      if (!isRecording.value && !mediaStream && !inputAudioContext)
        return;

      updateStatus('Stopping recording...');

      isRecording.value = false;
      hasStartedSpeaking = false;
      isInQuietDuration = false; // Reset quiet duration flag

      // Stop all audio playback
      stopAllAudio();

      // Clear quiet audio timer
      if (quietAudioTimer) {
        clearTimeout(quietAudioTimer);
        quietAudioTimer = null;
      }

      // Stop waveform animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Disconnect and clean up audio nodes
      if (scriptProcessorNode) {
        scriptProcessorNode.disconnect();
        scriptProcessorNode = null;
      }

      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
      }

      if (inputNode) {
        inputNode.disconnect();
      }

      // Stop all media tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }

      // Close audio contexts only if they are not already closed
      if (inputAudioContext && inputAudioContext.state !== 'closed') {
        try {
          inputAudioContext.close();
        } catch (e) {
          console.log('Input AudioContext already closed');
        }
      }

      if (outputAudioContext && outputAudioContext.state !== 'closed') {
        try {
          outputAudioContext.close();
        } catch (e) {
          console.log('Output AudioContext already closed');
        }
      }

      session?.close();

      updateStatus('Recording stopped. Click Start to begin again.');
    };

    onMounted(() => {
      requestMicrophoneAccess();
    });

    onUnmounted(() => {
      stopRecording();
      session?.close();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });

    return {
      isRecording,
      status,
      error,
      systemWaveformData,
      userWaveformData,
      selectedInterruptSensitivity,
      interruptSensitivityOptions,
      startRecording,
      stopRecording
    };
  },
  template: `
    <div class="hidden">
    <div v-if="status">{{ status }}</div>
    <div v-if="error" class="text-red-500">{{ error }}</div>
    </div>
  `
});

const CharacterImage = defineComponent({
  props: {
    character: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: ''
    },
    mood: {
      type: String,
      default: ''
    },
    style: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: 'imagen-4.0-fast-generate-001'
    }
  },
  emits: ['update:imagePrompt'],
  setup(props, { emit }) {
    const imageUrl = ref('');
    const status = ref('');
    const isLoading = ref(false);
    const generatingVideoUrl = ref('');
    const errorMessage = ref(''); // Add error message ref

    const checkKeyPixels = (imageData: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(false);
            return;
          }
          ctx.drawImage(img, 0, 0);

          // Define the key pixels to check
          const keyPixels = [
            { x: 0, y: 0 }, // top-left
            { x: img.width - 1, y: 0 }, // top-right
            { x: Math.floor(img.width / 2), y: 0 }, // top-center
            { x: 0, y: img.height - 1 }, // bottom-left
            { x: img.width - 1, y: img.height - 1 }, // bottom-right
            { x: Math.floor(img.width / 2), y: img.height - 1 } // bottom-center
          ];

          // Check each key pixel
          for (const pixel of keyPixels) {
            const pixelData = ctx.getImageData(pixel.x, pixel.y, 1, 1).data;
            const isDark = pixelData[0] < 250 && pixelData[1] < 250 && pixelData[2] < 250;
            if (isDark) {
              resolve(true);
              return;
            }
          }
          resolve(false);
        };
        img.onerror = () => resolve(false);
        img.src = imageData;
      });
    };

    const loadKey = async (message: string) => {
      const res = await fetch(KEY_URL);
      const blob = await res.blob();
      imageUrl.value = URL.createObjectURL(blob);
      errorMessage.value = message;
    };

    const loadPreload = async () => {
      const res = await fetch(PRELOAD_URL);
      const blob = await res.blob();
      imageUrl.value = URL.createObjectURL(blob);
    };

    const generateImage = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const characterDescription = {
        'dog': 'dog with floppy ears, wet nose, and wagging tail',
        'cat': 'cat with pointed ears, long whiskers, and a swishing tail',
        'hamster': 'hamster with round body, small ears, and chubby cheeks',
        'fox': 'fox with pointed ears, bushy tail, and narrow snout',
        'bear': 'bear with round ears, short tail, and large paws',
        'panda': 'panda with black and white fur, round ears, and distinctive eye patches',
        'lion': 'lion with majestic mane, tufted tail, and powerful paws',
        'sloth': 'sloth with long limbs, curved claws, and sleepy expression',
        'skunk': 'skunk with bushy tail, white stripe, and small pointed ears',
        'owl': 'owl with large round eyes, pointed beak, and feathered tufts',
        'peacock': 'peacock with iridescent tail feathers, crest, and elegant neck',
        'parrot': 'parrot with curved beak, colorful feathers, and expressive eyes',
        'frog': 'frog with bulging eyes, webbed feet, and smooth skin',
        'trex': 'trex with tiny arms, massive head, and powerful legs',
        'trucker': 'grizzled truck driver with tired eyes and a greasy cap'
      }[props.character] || 'a colorful blob of clay';

      const roleDescription = {
        'Pirate': 'pirate wearing a tricorn hat and eye patch with a parrot on head',
        'Cowboy': 'cowboy wearing a cowboy hat and holding a lasso with a handkerchief around neck',
        'Surfer': 'surfer holding surfboard with tanlines and frosted hair',
        'Royalty': 'royal leader with crown and red gem studded robe',
        'Robot': 'robot made of silver metal with exposed electronics and wires',
        'Clown': 'colorful rainbow wig and wearing wearing oversized shoes',
        'Nerd': 'nerdy with glasses and books in backpack'
      }[props.role] || '';

      const moodDescription = {
        'Happy': MOOD_ATTRIBUTES['Happy'].visualDescriptor,
        'Sad': MOOD_ATTRIBUTES['Sad'].visualDescriptor,
        'Angry': MOOD_ATTRIBUTES['Angry'].visualDescriptor,
        'Terrified': MOOD_ATTRIBUTES['Terrified'].visualDescriptor,
        'Tired': MOOD_ATTRIBUTES['Tired'].visualDescriptor,
        'Amazed': MOOD_ATTRIBUTES['Amazed'].visualDescriptor,
        'Relieved': MOOD_ATTRIBUTES['Relieved'].visualDescriptor
      }[props.mood] || '';

      const styleDescription = {
        'Reading': 'reading from a book',
        'Yelling': 'yelling passionately',
        'Performing': 'performing on stage with spotlight',
        'Dramatic': 'dramatically reciting Shakespeare with big emotions',
        'Whispering': 'whispering secrets',
        'Speaking': 'giving a speech',
        'Poetry': 'poetry reciting a famous poem'
      }[props.style] || '';

      const getRandomAccessories = (role: string, count: number = 2) => {
        const accessories = VISUAL_ACCESSORIES[role] || [];
        const shuffled = [...accessories].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).join(', ');
      };

      let visualDescription = `A ${characterDescription}`;
      if (moodDescription) {
        visualDescription += ` who is ${moodDescription}`;
      }
      if (roleDescription) {
        const randomAccessories = getRandomAccessories(props.role);
        visualDescription += ` and looks like a ${props.character} ${roleDescription}, wearing ${randomAccessories}`;
      }
      if (styleDescription) {
        visualDescription += ` while ${styleDescription}`;
      }

      const prompt = `Create a ${visualDescription} photograph in a whimsical, minimalist style. The character/object should appear as if realistically handcrafted from realistic modeling clay five inches tall with evidence of textual imperfections like well defined prominant fingerprints, strong rough bump mapping with clay texture, or small mistakes. Accessories can be made out of metal or plastic. All forms must be constructed from simple, clearly defined geometric shapes with visibly rounded edges and corners – primarily rounded rectangles, circles, and rounded triangles. Avoid any sharp points or harsh angles.

Emphasize a playful rhythm through a thoughtful variation in the size and arrangement of these foundational clay shapes, ensuring no two adjacent elements feel monotonous in visual weight. The overall design should be simple, using the fewest shapes necessary to clearly define the subject.

The character/object should be presented as a full shot, centered against a stark, clean white background, ensuring the entire subject is visible with ample negative space (padding) around it on all sides. Absolutely no part of the character/object should be cut off or touch the edges of the image. 

The character/object should be presented against a stark, clean white background. Include a solid-colored warm shadow directly beneath the character/object; the shadow color should be a slightly darker shade of a color present in the character/object or a warm dark tone if the character is very light. Do not use gradients or perspective in the shadow.

Use a vibrant and playful color palette, favoring light pastels for base colors if the subject needs to appear light against the white background. Limit the overall illustration to 3-5 distinct, solid, matte colors. Avoid pure white as a primary color for the subject itself. Avoid grays.  The final image should feel like a frame from a charming claymation shot with a real film camera, ready for hand animation, with a consistent and delightful aesthetic.

Only portray the character. Avoid secondary background elements. 

IMPORTANT! Only display the correct number of limbs for a ${props.character} (2 for upright characters) with a complete ${props.character} body.

IMPORTANT! Place the character in a pose indicative of their personality with the correct number of limbs and/or appendages. 

IMPORTANT! The eyes of the character MUST be realistic plastic googly eyes (also called wiggle eyes) with diffused specular highlights: each eye should be a small, shiny, domed disk of clear plastic with a flat white backing and a loose, freely moving black plastic pupil inside that can wiggle or shift position. The black pupil should be large to make the eyes look extra cute. The googly eyes should be highly reflective, with visible plastic highlights and a sense of depth from the domed lens. The eyes should look like they were glued onto the clay face, with a slightly uneven, handmade placement. The plasticiness and playful, toy-like quality of the googly eyes should be extremely obvious and visually delightful. The eyes must be looking forward straight towards the camera while still in an expressive pose.

DO NOT JUST STAND STRAIGHT FACING THE CAMERA! DO NOT BE BORING!`;

      emit('update:imagePrompt', prompt);
      isLoading.value = true;
      status.value = '';
      imageUrl.value = '';

      try {
        const response = await ai.models.generateImages({
          model: props.model,
          prompt: prompt,
          config: { numberOfImages: 3, outputMimeType: 'image/jpeg' },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
          let foundNonBlack = false;
          let lastSrc = '';
          for (let i = 0; i < response.generatedImages.length; i++) {
            const imgObj = response.generatedImages[i];
            if (imgObj.image?.imageBytes) {
              const src = `data:image/jpeg;base64,${imgObj.image.imageBytes}`;
              lastSrc = src;
              // eslint-disable-next-line no-await-in-loop
              const isBlack = await checkKeyPixels(src);
              if (!isBlack && !foundNonBlack) {
                imageUrl.value = src;
                status.value = 'Done!';
                foundNonBlack = true;
                break;
              }
            }
          }
          if (!foundNonBlack) {
            imageUrl.value = lastSrc;
            status.value = 'All images had black edge pixels, using last one.';
          }
          isLoading.value = false;
          return;
        } else {
          throw new Error('No image data received from Imagen.');
        }
      } catch (e) {
        let message = e instanceof Error ? e.message : 'Unknown image generation error.';
        // Check for quota exceeded error
        if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
          await loadKey('Imagen API quota exceeded, please set a project with more resources by clicking the key icon in the toolbar');
        } else {
          errorMessage.value = message;
          imageUrl.value = '';
        }
      } finally {
        isLoading.value = false;
      }
    };

    const loadGeneratingVideo = async () => {
      const res = await fetch(GENERATING_VIDEO_URL);
      const blob = await res.blob();
      generatingVideoUrl.value = URL.createObjectURL(blob);
    };

    onMounted(async () => {
      loadPreload();
      await loadGeneratingVideo();
      if (!props.character && !props.role && !props.mood && !props.style) {
        return
      }
      isLoading.value = true
      await generateImage();
    });

    onUnmounted(() => {
      if (generatingVideoUrl.value) {
        URL.revokeObjectURL(generatingVideoUrl.value);
      }
    });

    return {
      imageUrl,
      status,
      isLoading,
      generatingVideoUrl,
      errorMessage,
      loadKey,
    };
  },
  template: `
    <div class="relative w-full aspect-square flex items-center justify-center rounded-lg overflow-hidden">
      <div v-if="errorMessage" class="absolute top-0 left-0 right-0 z-30 text-red-600 font-bold text-sm w-1/3">{{ errorMessage }}</div>
      <div v-show="isLoading" class="absolute z-20 -top-60 inset-0 flex items-center justify-center bg-white/10 m-2">
        <div class="relative w-12 h-12">
          <div class="absolute inset-0 border-8 border-black/50 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
      <img v-if="imageUrl" class="transform scale-100 w-full h-full object-cover transition-opacity duration-1000" :class="{ 'opacity-0': isLoading, 'opacity-90': !isLoading }" :src="imageUrl"/>
      <video :key="imageUrl" :class="isLoading ? 'opacity-100' : 'opacity-0'" class="scale-100 pointer-events-none transition-all absolute" muted autoplay :src="generatingVideoUrl"/>
    </div>
  `
});

const VISUAL_ACCESSORIES: Record<string, string[]> = {
  'Pirate': [
    'a weathered tricorn hat at a jaunty angle',
    'an eye patch with a twinkling gem',
    'a gold hoop earring',
    'a wooden prosthetic limb',
    'a tattered treasure map in pocket'
  ],
  'Cowboy': [
    'a leather vest with sheriff\'s badge',
    'a bandana with sunset pattern',
    'jingling spurs on boots',
    'a Stetson hat tipped back',
    'a lasso coiled at hip'
  ],
  'Surfer': [
    'board shorts with shark bite pattern',
    'a wetsuit with sunset design',
    'a surfboard propped nearby',
    'salt-encrusted fur/feathers',
    'sunglasses perched on head'
  ],
  'Royalty': [
    'an ornate crown at a jaunty angle',
    'a velvet cape with ermine trim',
    'a scepter with glowing gem',
    'a golden goblet on table',
    'a small throne-like perch nearby'
  ],
  'Robot': [
    'mismatched mechanical parts',
    'twitching antennae with lights',
    'a retractable tool in side',
    'a trail of nuts and bolts',
    'a holographic display on chest'
  ],
  'Clown': [
    'a polka-dot suit with big buttons',
    'a rainbow wig defying gravity',
    'a red nose that honks',
    'oversized shoes',
    'juggling balls scattered around'
  ],
  'Nerd': [
    'thick-rimmed glasses on nose',
    'a pocket protector with pens',
    'a lab coat with equations',
    'a slide rule on belt',
    'a glowing test tube in pocket'
  ]
};

const ImagineComponent = defineComponent({
  components: {
    LiveAudioComponent,
    CharacterImage,
    AuthModal,
    UserProfile
  },
  setup() {
    // Authentication state
    const { currentUser, isAuthenticated, loading: authLoading } = useAuth();
    const showAuthModal = ref(false);
    const showProfileModal = ref(false);
    const authMode = ref<'login' | 'signup' | 'reset'>('login');

    const currentView = ref<'avatars' | 'audiobook' | 'sentry-test'>('avatars');
    // Lazy-loaded view components
    const AvatarsView = ref<any>(null);
    const AudiobookView = ref<any>(null);

    const loadView = async (view: 'avatars' | 'audiobook') => {
      if (view === 'avatars' && !AvatarsView.value) {
        const mod = await import('./src/views/AvatarsView');
        AvatarsView.value = mod.default;
      }
      if (view === 'audiobook' && !AudiobookView.value) {
        const mod = await import('./src/views/AudiobookView');
        AudiobookView.value = mod.default;
      }
    };
    const noAudioCount = ref<number>(0); // Add counter for no-audio events
    const characterGenerated = ref<boolean>(false);
    const playingResponse = ref<boolean>(false);
    const currentIndex = ref<number>(0);
    const totalItems = 5; // Total number of .imanim divs
    const liveAudioRef = ref<InstanceType<typeof LiveAudioComponent> | null>(null);
    const characterImageRef = ref<InstanceType<typeof CharacterImage> | null>(null);
    const characterVoiceDescription = ref<string>('');
    const characterVisualDescription = ref<string>(''); // New ref for visual description
    const availableVoices = [
      'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
      'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina',
      'Erinome', 'Sulafat', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam',
      'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix',
      'Sadachbia', 'Sadaltager'
    ];
    const selectedVoice = ref<string>(availableVoices[Math.floor(Math.random() * availableVoices.length)]);
    const selectedRole = ref<string>('');
    const selectedMood = ref<string>('');
    const selectedStyle = ref<string>('');
    const selectedCharacter = ref<string>('');
    const selectedDialogModel = ref<string>(DEFAULT_DIALOG_MODEL);
    const selectedImageModel = ref<string>(DEFAULT_IMAGE_MODEL);
    const selectedInterruptSensitivity = ref<StartSensitivity>(DEFAULT_INTERRUPT_SENSITIVITY);
    const showShareModal = ref<boolean>(false);
    const showRawModal = ref<boolean>(false);
    const isCopied = ref<boolean>(false);
    const isConnecting = ref<boolean>(false);
    const actualVoicePrompt = ref<string>('');
    const actualImagePrompt = ref<string>('');
    let clickAudio: HTMLAudioElement | null = null;
    const showVoiceDropdown = ref(false);
    const imageTimestamp = ref<number>(Date.now()); // Add timestamp ref
    const voiceOptions = [
      { name: 'Zephyr', style: 'Bright', pitch: 'Mid-Hi', suitability: 'Ideal for cheerful, energetic characters. Excels in happy or amazed moods.' },
      { name: 'Puck', style: 'Upbeat', pitch: 'Mid', suitability: 'A versatile, positive voice. Works well for friendly cowboys or happy clowns.' },
      { name: 'Charon', style: 'Informative', pitch: 'Lower', suitability: 'A serious, authoritative tone. Good for royalty, robots, or nerds conveying knowledge.' },
      { name: 'Kore', style: 'Firm', pitch: 'Mid', suitability: 'A direct and confident voice. Suitable for assertive roles like pirates or royalty.' },
      { name: 'Fenrir', style: 'Excitable', pitch: 'Younger', suitability: 'Youthful and energetic. Perfect for amazed or happy moods, and playful characters.' },
      { name: 'Leda', style: 'Youthful', pitch: 'Mid-hi', suitability: 'A light, young voice. Great for happy and relieved emotions.' },
      { name: 'Orus', style: 'Firm', pitch: 'Mid-Low', suitability: 'Strong and steady. Good for serious or angry cowboys and pirates.' },
      { name: 'Aoede', style: 'Breezy', pitch: 'Mid', suitability: 'A light and casual voice. Fits well with surfer roles and happy or relieved moods.' },
      { name: 'Callirrhoe', style: 'Easy-going', pitch: 'Mid', suitability: 'Relaxed and friendly. Excellent for surfers or casual, happy characters.' },
      { name: 'Autonoe', style: 'Bright', pitch: 'Mid', suitability: 'Clear and cheerful. A good all-rounder for positive moods.' },
      { name: 'Enceladus', style: 'Breathy', pitch: 'Lower', suitability: 'A soft, intimate voice. Perfect for whispering, sad, or tired moods.' },
      { name: 'Iapetus', style: 'Clear', pitch: 'Mid-Low', suitability: 'A straightforward, clear voice. Suitable for nerds or informative robots.' },
      { name: 'Umbriel', style: 'Easy-going', pitch: 'Mid-Low', suitability: 'A calm and relaxed voice. Works well for sloths or tired characters.' },
      { name: 'Algieba', style: 'Smooth', pitch: 'Lower', suitability: 'A deep, smooth voice. Ideal for dramatic readings, royalty, or sad moods.' },
      { name: 'Despina', style: 'Smooth', pitch: 'Mid', suitability: 'A pleasant, even voice. Versatile for speaking styles or neutral moods.' },
      { name: 'Erinome', style: 'Clear', pitch: 'Mid', suitability: 'A crisp and articulate voice. Good for nerds or performing styles.' },
      { name: 'Sulafat', style: 'Warm', pitch: 'Mid', suitability: 'A friendly and inviting voice. Great for happy moods and storyteller roles.' },
      { name: 'Algenib', style: 'Gravelly', pitch: 'Low', suitability: 'A deep, rough voice. Perfect for pirates, cowboys, or angry characters.' },
      { name: 'Rasalgethi', style: 'Informative', pitch: 'Mid', suitability: 'A knowledgeable and clear tone. Excellent for nerds or robots.' },
      { name: 'Laomedeia', style: 'Upbeat', pitch: 'Mid Hi', suitability: 'A very energetic and positive voice. Great for amazed, happy clowns or surfers.' },
      { name: 'Achernar', style: 'Soft', pitch: 'High', suitability: 'A gentle, high-pitched voice. Good for whispering, sad, or terrified moods.' },
      { name: 'Alnilam', style: 'Firm', pitch: 'Mid-low', suitability: 'A strong, assertive voice. Works for angry pirates or determined cowboys.' },
      { name: 'Schedar', style: 'Even', pitch: 'Mid-low', suitability: 'A steady and balanced voice. Versatile for speaking or reading.' },
      { name: 'Gacrux', style: 'Mature', pitch: 'Mid', suitability: 'A mature, composed voice. Good for royalty or dramatic readings.' },
      { name: 'Pulcherrima', style: 'Forward', pitch: 'Mid High', suitability: 'A bright, projecting voice. Ideal for performing or yelling styles.' },
      { name: 'Achird', style: 'Friendly', pitch: 'Mid', suitability: 'A warm and approachable voice. Excellent for happy and relieved moods.' },
      { name: 'Zubenelgenubi', style: 'Casual', pitch: 'Mid Low', suitability: 'A relaxed, everyday voice. Fits well with surfers or speaking styles.' },
      { name: 'Vindemiatrix', style: 'Gentle', pitch: 'Mid Low', suitability: 'A soft, calming voice. Great for sad, tired, or whispering styles.' },
      { name: 'Sadachbia', style: 'Lively', pitch: 'Low', suitability: 'An energetic, deep voice. Good for enthusiastic pirates or clowns.' },
      { name: 'Sadaltager', style: 'Knowledgeable', pitch: 'Mid', suitability: 'An intelligent and clear voice. Perfect for nerds and informative roles.' }
    ];
    const logoUrl = ref<string>(''); // Add ref for logo URL
    const clickSoundUrl = ref('');
    const showClickToRestartHelp = ref(false);
    const isPlayerVisible = ref(false);
    const isSmallScreen = ref(window.innerWidth < 1024);
    const isPlayerInDOM = ref(false);
    const forceShowBottomMessage = ref(false);

    // Audiobook Creator State
    const audiobookState = reactive({
      step: 'upload', // upload, parsing, editing, generating, finished
      fileName: '',
      script: [] as { character: string; line: string }[],
      characters: [] as {
        name: string;
        description: string;
        style: string;
        prompt: string;
        imageUrl: string | null;
        isLoading: boolean;
      }[],
      scenes: [] as {
        insertAfterLineIndex: number;
        prompt: string;
        imageUrl: string | null;
        isLoading: boolean;
      }[],
      voiceAssignments: {} as Record<string, string>,
      generationProgress: 0,
      finalAudioUrl: null as string | null,
      error: null as string | null,
      currentlyPlayingLine: -1,
      editingTab: 'voices', // 'voices', 'characters', 'scenes'
    });
    const ART_STYLES = ['Realistic', 'Cartoon', 'Anime', '3D Animation', 'Watercolor', 'Pixel Art'];
    let previewAudio: HTMLAudioElement | null = null;

    const selectedVoiceInfo = computed(() => {
      return voiceOptions.find(v => v.name === selectedVoice.value) || voiceOptions[0];
    });

    const isEverythingSelected = computed(() => {
      return (selectedStyle.value && selectedMood.value && selectedCharacter.value && selectedRole.value);
    });

    const remainingSelections = computed(() => {
      const missing = [];
      if (!selectedCharacter.value) missing.push('character');
      if (!selectedRole.value) missing.push('role');
      if (!selectedMood.value) missing.push('mood');
      if (!selectedStyle.value) missing.push('style');
      return missing;
    });

    const audiobookScriptWithScenes = computed(() => {
      const merged: ({ type: 'line'; data: any } | { type: 'scene'; data: any })[] = [];
      const sceneMap = new Map(audiobookState.scenes.map(s => [s.insertAfterLineIndex, s]));
      audiobookState.script.forEach((line, index) => {
        merged.push({ type: 'line', data: line });
        if (sceneMap.has(index)) {
          const sceneData = sceneMap.get(index);
          if (sceneData) {
            merged.push({ type: 'scene', data: sceneData });
          }
        }
      });
      return merged;
    });

    const selectionPrompt = computed(() => {
      if (remainingSelections.value.length === 4) {
        return 'Make selections to get started!';
      }
      if (remainingSelections.value.length === 1) {
        return `Select ${remainingSelections.value[0]} to get started!`;
      }
      const selections = [...remainingSelections.value];
      const lastItem = selections.pop();
      return `Select ${selections.join(', ')} and ${lastItem} to get started!`;
    });

    const isInSession = computed(() => {
      return isConnecting.value || playingResponse.value;
    });

    const regenerateImage = () => {
      // Update the timestamp to force re-render
      imageTimestamp.value = Date.now();
    };

    const characterImageKey = computed(() => {
      return isEverythingSelected.value ? `${selectedCharacter.value}${selectedRole.value}${selectedMood.value}${selectedStyle.value}` : 'default';
    });

    const toggleVoiceDropdown = () => {
      showVoiceDropdown.value = !showVoiceDropdown.value;
    };

    const selectVoice = (voice: string) => {
      selectedVoice.value = voice;
      showVoiceDropdown.value = false;
      updateDescription();
      onGenerateCharacter();
    };

    const getShareUrl = async () => {
      const baseUrl = await window.aistudio?.getHostUrl();
      const params = `${selectedCharacter.value.toLowerCase()}-${selectedRole.value.toLowerCase()}-${selectedMood.value.toLowerCase()}-${selectedStyle.value.toLowerCase()}-${selectedVoice.value.toLowerCase()}`;
      return `${baseUrl}&appParams=${params}`;
    };

    const copyToClipboard = async () => {
      try {
        const url = await getShareUrl();
        await navigator.clipboard.writeText(url);
        isCopied.value = true;
        setTimeout(() => {
          isCopied.value = false;
        }, 2000);
      } catch (err) {
        console.log('Failed to copy text: ', err);
      }
    };

    const loadFromUrl = () => {
      const appParams = window.location.hash.substring(1)

      if (appParams) {
        const [character, role, mood, style, voice] = appParams.split('-');

        // Helper function to find case-insensitive match
        const findCaseInsensitiveMatch = (value: string, options: string[]) => {
          const lowerValue = value.toLowerCase();
          return options.find(option => option.toLowerCase() === lowerValue) || '';
        };

        // Find matches for each component
        if (character) {
          const characterOptions = ['dog', 'cat', 'hamster', 'fox', 'bear', 'panda', 'lion', 'sloth', 'skunk', 'owl', 'peacock', 'parrot', 'frog', 'trex', 'trucker'];
          selectedCharacter.value = findCaseInsensitiveMatch(character, characterOptions);
        }
        if (role) {
          const roleOptions = ['Pirate', 'Cowboy', 'Surfer', 'Royalty', 'Robot', 'Clown', 'Nerd'];
          selectedRole.value = findCaseInsensitiveMatch(role, roleOptions);
        }
        if (mood) {
          const moodOptions = ['Happy', 'Sad', 'Angry', 'Terrified', 'Tired', 'Amazed', 'Relieved'];
          selectedMood.value = findCaseInsensitiveMatch(mood, moodOptions);
        }
        if (style) {
          const styleOptions = ['Reading', 'Yelling', 'Performing', 'Dramatic', 'Whispering', 'Speaking', 'Poetry'];
          selectedStyle.value = findCaseInsensitiveMatch(style, styleOptions);
        }
        if (voice) {
          const voiceOptionsList = voiceOptions.map(v => v.name);
          selectedVoice.value = findCaseInsensitiveMatch(voice, voiceOptionsList);
        }

        updateDescription();
      }
    };

    const loadClickSound = async () => {
      const res = await fetch(CLICK_SOUND_URL);
      const blob = await res.blob();
      clickSoundUrl.value = URL.createObjectURL(blob);
      clickAudio = new Audio(clickSoundUrl.value);
    };

    const playClickSound = () => {
      if (clickAudio) {
        clickAudio.currentTime = 0;
        clickAudio.play();
      }
    };

    const updateDescription = () => {
      if (!selectedCharacter.value) return;

      const character = CHARACTER_ATTRIBUTES[selectedCharacter.value as CharacterType];
      const role = selectedRole.value ? ROLE_ATTRIBUTES[selectedRole.value] : null;
      const mood = selectedMood.value ? MOOD_ATTRIBUTES[selectedMood.value] : null;
      const style = selectedStyle.value ? STYLE_ATTRIBUTES[selectedStyle.value] : null;

      const voiceParts = [];
      if (character) voiceParts.push(character.trait, character.want, character.flaw);
      if (role) voiceParts.push(role.voiceInstruction);
      if (mood) voiceParts.push(mood.voiceInstruction);

      const visualParts = [];
      if (character) visualParts.push(character.visualDescriptor);
      if (role) visualParts.push(role.visualDescriptor);
      if (mood) visualParts.push(mood.visualDescriptor);
      if (style) visualParts.push(style.visualDescriptor);

      characterVoiceDescription.value = voiceParts.join(' ');
      characterVisualDescription.value = visualParts.join(' ');

      actualVoicePrompt.value = `You are ${character.nameIntro}. ${characterVoiceDescription.value}`;
    };

    const onGenerateCharacter = async () => {
      if (!isEverythingSelected.value) {
        return;
      }
      playClickSound();
      isConnecting.value = true;
      forceShowBottomMessage.value = true;
      showClickToRestartHelp.value = false;
      noAudioCount.value = 0;
      await nextTick();
      if (liveAudioRef.value) {
        if (liveAudioRef.value.isRecording) {
          liveAudioRef.value.stopRecording();
        }
        liveAudioRef.value.startRecording(
          actualVoicePrompt.value,
          selectedVoice.value,
          selectedDialogModel.value,
        );
      }
      isPlayerInDOM.value = true;
      isPlayerVisible.value = true;
      playingResponse.value = true;
    };

    const selectCharacter = (character: string) => {
      selectedCharacter.value = character;
      playClickSound();
      updateDescription();
      onGenerateCharacter();
    };

    const selectRole = (role: string) => {
      selectedRole.value = role;
      playClickSound();
      updateDescription();
      onGenerateCharacter();
    };

    const selectMood = (mood: string) => {
      selectedMood.value = mood;
      playClickSound();
      updateDescription();
      onGenerateCharacter();
    };

    const selectStyle = (style: string) => {
      selectedStyle.value = style;
      playClickSound();
      updateDescription();
      onGenerateCharacter();
    };

    const handleNoAudio = () => {
      noAudioCount.value++;
      if (noAudioCount.value >= 2) {
        console.log('Detected 2 consecutive no-audio events, stopping.');
        liveAudioRef.value?.stopRecording();
        playingResponse.value = false;
        isConnecting.value = false;
        showClickToRestartHelp.value = true;
        forceShowBottomMessage.value = false;
      } else {
        console.log(`No-audio event ${noAudioCount.value}, retrying...`);
        // Immediately try again
        onGenerateCharacter();
      }
    };

    const handleSpeakingStart = () => {
      isConnecting.value = false;
      noAudioCount.value = 0;
    };

    const handleExtendedQuiet = () => {
      console.log('Extended quiet period detected, stopping.');
      liveAudioRef.value?.stopRecording();
      playingResponse.value = false;
      isConnecting.value = false;
      showClickToRestartHelp.value = true;
      forceShowBottomMessage.value = false;
    };

    const handleQuotaExceeded = async () => {
      console.log('Quota exceeded, stopping.');
      liveAudioRef.value?.stopRecording();
      playingResponse.value = false;
      isConnecting.value = false;
      showClickToRestartHelp.value = false;
      forceShowBottomMessage.value = false;
      if (characterImageRef.value) {
        await characterImageRef.value.loadKey('Dialog API quota exceeded, please set a project with more resources by clicking the key icon in the toolbar');
      }
    };

    const stopPlaybackAndReset = () => {
      if (liveAudioRef.value) {
        liveAudioRef.value.stopRecording();
      }
      playingResponse.value = false;
      isConnecting.value = false;
      isPlayerVisible.value = false;
      showClickToRestartHelp.value = false;
      forceShowBottomMessage.value = false;
    };

    const handleResize = () => {
      isSmallScreen.value = window.innerWidth < 1024;
    };

    const loadLogo = async () => {
      const res = await fetch(LOGO_URL);
      const blob = await res.blob();
      logoUrl.value = URL.createObjectURL(blob);
    };

    // --- Audiobook Creator Methods ---

    const resetAudiobookCreator = () => {
      audiobookState.step = 'upload';
      audiobookState.fileName = '';
      audiobookState.script = [];
      audiobookState.characters = [];
      audiobookState.scenes = [];
      audiobookState.voiceAssignments = {};
      audiobookState.generationProgress = 0;
      if (audiobookState.finalAudioUrl) {
        URL.revokeObjectURL(audiobookState.finalAudioUrl);
      }
      audiobookState.finalAudioUrl = null;
      audiobookState.error = null;
      audiobookState.currentlyPlayingLine = -1;
      audiobookState.editingTab = 'voices';
    };

    const handleFileUpload = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      if (file.type !== 'text/plain') {
        audiobookState.error = 'Please upload a valid .txt file.';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        audiobookState.fileName = file.name;
        await parseChapterToScript(text);
      };
      reader.onerror = () => {
        audiobookState.error = 'Failed to read the file.';
        audiobookState.step = 'upload';
      };
      reader.readAsText(file);
    };

    const parseChapterToScript = async (text: string) => {
      audiobookState.step = 'parsing';
      audiobookState.error = null;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `You are an expert scriptwriter and art director for audiobooks. Analyze the following ebook chapter text and convert it into a structured JSON format suitable for production.

        Instructions:
        1.  **Script Generation**: Create a "script" array. Each element should be an object with "character" and "line" properties. Identify all dialogue and narration, assigning narration to a "Narrator" character. Clean up dialogue by removing quotes.
        2.  **Character Analysis**: Create a "characters" array. For each character (including Narrator), create an object with:
            *   "name": The character's name.
            *   "description": A concise physical and personality description based ONLY on the provided text.
            *   "style": Suggest an artistic style from this list: [${ART_STYLES.map(s => `'${s}'`).join(', ')}].
            *   "prompt": Generate a detailed text-to-image prompt for a portrait of the character, incorporating the description and style. The prompt should aim for a consistent character likeness.
        3.  **Scene Identification**: Create a "scenes" array. Identify key moments suitable for illustration. For each, create an object with:
            *   "insertAfterLineIndex": The zero-based index of the script line AFTER which this scene image should appear.
            *   "prompt": A detailed text-to-image prompt to generate the illustration for this scene.

        Output the entire result as a single valid JSON object.

        Chapter Text:
        ---
        ${text}
        ---`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                script: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      character: { type: Type.STRING },
                      line: { type: Type.STRING }
                    },
                    required: ['character', 'line']
                  }
                },
                characters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      style: { type: Type.STRING },
                      prompt: { type: Type.STRING },
                    },
                    required: ['name', 'description', 'style', 'prompt']
                  }
                },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      insertAfterLineIndex: { type: Type.INTEGER },
                      prompt: { type: Type.STRING },
                    },
                    required: ['insertAfterLineIndex', 'prompt']
                  }
                }
              }
            },
          },
        });

        const result = JSON.parse(response.text);

        audiobookState.script = result.script;
        audiobookState.characters = result.characters.map((c: any) => ({ ...c, imageUrl: null, isLoading: false }));
        audiobookState.scenes = result.scenes.map((s: any) => ({ ...s, imageUrl: null, isLoading: false }));

        const characterNames = result.characters.map((c: any) => c.name);
        audiobookState.voiceAssignments = characterNames.reduce((acc: Record<string, string>, charName: string) => {
          acc[charName] = voiceOptions[0].name; // Assign a default voice
          return acc;
        }, {});

        audiobookState.step = 'editing';
      } catch (e) {
        console.error(e);
        audiobookState.error = e instanceof Error ? e.message : 'Failed to parse the chapter. The content may be too complex. Please try again with a simpler chapter.';
        audiobookState.step = 'upload';
      }
    };

    const playPreviewLine = async (line: { character: string; line: string }, index: number) => {
      if (audiobookState.currentlyPlayingLine === index) {
        if (previewAudio) {
          previewAudio.pause();
          previewAudio = null;
        }
        audiobookState.currentlyPlayingLine = -1;
        return;
      }

      audiobookState.currentlyPlayingLine = index;

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const voiceName = audiobookState.voiceAssignments[line.character];
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: line.line }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          source.start();
          source.onended = () => {
            if (audiobookState.currentlyPlayingLine === index) {
              audiobookState.currentlyPlayingLine = -1;
            }
          };
        }
      } catch (error) {
        console.error("Preview failed:", error);
        audiobookState.currentlyPlayingLine = -1;
      }
    };

    const generateAudiobookImage = async (item: { prompt: string; imageUrl: string | null; isLoading: boolean; }) => {
      if (!item.prompt) return;
      item.isLoading = true;
      item.imageUrl = null;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateImages({
          model: selectedImageModel.value,
          prompt: item.prompt,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
        });
        if (response.generatedImages && response.generatedImages[0].image?.imageBytes) {
          const src = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
          item.imageUrl = src;
        } else {
          throw new Error('No image data received from the API.');
        }
      } catch (e) {
        console.error("Image generation failed:", e);
        // Optionally set an error message on the item to display in the UI
      } finally {
        item.isLoading = false;
      }
    };

    function writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    function createWavFile(pcmData: Uint8Array): Blob {
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const header = new ArrayBuffer(44);
      const view = new DataView(header);

      writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + pcmData.byteLength, true);
      writeString(view, 8, 'WAVE');
      writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
      view.setUint16(32, numChannels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, 'data');
      view.setUint32(40, pcmData.byteLength, true);

      const pcmBuffer = new ArrayBuffer(pcmData.byteLength);
      new Uint8Array(pcmBuffer).set(pcmData);

      return new Blob([header, pcmBuffer], { type: 'audio/wav' });
    }

    const generateFullAudiobook = async () => {
      audiobookState.step = 'generating';
      audiobookState.generationProgress = 0;
      const allPcmData: Uint8Array[] = [];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        for (let i = 0; i < audiobookState.script.length; i++) {
          const item = audiobookState.script[i];
          const voiceName = audiobookState.voiceAssignments[item.character];

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: item.line }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            allPcmData.push(decode(base64Audio));
          }
          audiobookState.generationProgress = ((i + 1) / audiobookState.script.length) * 100;
        }

        const totalLength = allPcmData.reduce((acc, val) => acc + val.length, 0);
        const concatenatedPcm = new Uint8Array(totalLength);
        let offset = 0;
        for (const pcm of allPcmData) {
          concatenatedPcm.set(pcm, offset);
          offset += pcm.length;
        }

        const wavBlob = createWavFile(concatenatedPcm);
        audiobookState.finalAudioUrl = URL.createObjectURL(wavBlob);
        audiobookState.step = 'finished';

      } catch (e) {
        console.error(e);
        audiobookState.error = e instanceof Error ? e.message : 'Failed during audio generation.';
        audiobookState.step = 'editing';
      }
    };

    const downloadAudioFile = () => {
      if (!audiobookState.finalAudioUrl) return;
      const a = document.createElement('a');
      a.href = audiobookState.finalAudioUrl;
      a.download = `${audiobookState.fileName.replace('.txt', '')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    watch(() => isPlayerVisible.value, (newValue) => {
      if (!newValue) {
        setTimeout(() => {
          isPlayerInDOM.value = false;
        }, 1300); // Match this with the transition duration
      } else {
        isPlayerInDOM.value = true;
      }
    });

    onMounted(() => {
      loadFromUrl();
      updateDescription();
      loadClickSound();
      loadLogo();
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      if (clickSoundUrl.value) {
        URL.revokeObjectURL(clickSoundUrl.value);
      }
      if (logoUrl.value) {
        URL.revokeObjectURL(logoUrl.value);
      }
      window.removeEventListener('resize', handleResize);
    });

    const categories = {
      'Characters': {
        items: CHARACTER_ATTRIBUTES,
        selected: selectedCharacter,
        select: selectCharacter,
        getter: (item: any) => ({ emoji: item.emoji, name: item.name.split(' ')[0] })
      },
      'Roles': {
        items: ROLE_ATTRIBUTES,
        selected: selectedRole,
        select: selectRole,
        getter: (item: any) => ({ emoji: item.emoji, name: null })
      },
      'Moods': {
        items: MOOD_ATTRIBUTES,
        selected: selectedMood,
        select: selectMood,
        getter: (item: any) => ({ emoji: item.emoji, name: null })
      },
      'Styles': {
        items: STYLE_ATTRIBUTES,
        selected: selectedStyle,
        select: selectStyle,
        getter: (item: any) => ({ emoji: item.emoji, name: null })
      }
    };

    return {
      // Authentication
      currentUser,
      isAuthenticated,
      authLoading,
      showAuthModal,
      showProfileModal,
      authMode,
      // Rest of component state
      currentView,
      noAudioCount,
      characterGenerated,
      playingResponse,
      currentIndex,
      liveAudioRef,
      characterImageRef,
      selectedVoice,
      selectedRole,
      selectedMood,
      selectedStyle,
      selectedCharacter,
      selectedDialogModel,
      selectedImageModel,
      selectedInterruptSensitivity,
      characterVoiceDescription,
      characterVisualDescription,
      onGenerateCharacter,
      selectCharacter,
      selectRole,
      selectMood,
      selectStyle,
      showShareModal,
      showRawModal,
      isCopied,
      copyToClipboard,
      getShareUrl,
      actualVoicePrompt,
      actualImagePrompt,
      isConnecting,
      handleNoAudio,
      handleSpeakingStart,
      handleExtendedQuiet,
      handleQuotaExceeded,
      stopPlaybackAndReset,
      isEverythingSelected,
      selectionPrompt,
      isInSession,
      characterImageKey,
      toggleVoiceDropdown,
      selectVoice,
      showVoiceDropdown,
      voiceOptions,
      selectedVoiceInfo,
      regenerateImage,
      imageTimestamp,
      logoUrl,
      showClickToRestartHelp,
      isPlayerVisible,
      isSmallScreen,
      isPlayerInDOM,
      forceShowBottomMessage,
      categories,
      CHARACTER_ATTRIBUTES,
      ROLE_ATTRIBUTES,
      MOOD_ATTRIBUTES,
      STYLE_ATTRIBUTES,
      // Audiobook Creator
      audiobookState,
      resetAudiobookCreator,
      handleFileUpload,
      playPreviewLine,
      generateFullAudiobook,
      downloadAudioFile,
      generateAudiobookImage,
      ART_STYLES,
      audiobookScriptWithScenes
    };
  },
  template: `
    <div class="bg-blue w-full h-full flex flex-col items-center p-2 lg:p-4 text-black overflow-hidden font-sans">
      <header class="w-full flex justify-between items-center mb-2 lg:mb-4 px-2">
        <div class="flex items-center space-x-2">
          <img v-if="logoUrl" :src="logoUrl" class="w-8 h-8" alt="logo"/>
          <h1 class="text-xl lg:text-3xl font-bold">Audio Avatars</h1>
        </div>
        <div class="flex items-center space-x-4">
          <div class="bg-white/50 p-1 rounded-full flex text-sm">
             <button @click="(async ()=>{ currentView = 'avatars'; await loadView('avatars') })()" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'avatars' ? 'bg-black text-white' : 'hover:bg-black/10'">Avatars</button>
             <button @click="(async ()=>{ currentView = 'audiobook'; await loadView('audiobook') })()" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'audiobook' ? 'bg-black text-white' : 'hover:bg-black/10'">Audiobook Creator</button>
             <button @click="currentView = 'sentry-test'" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'sentry-test' ? 'bg-black text-white' : 'hover:bg-black/10'">Test Errors</button>
          </div>
          <div class="flex items-center space-x-2">
            <!-- Auth Buttons -->
            <button
              v-if="!isAuthenticated && !authLoading"
              @click="authMode = 'login'; showAuthModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-full transition"
            >
              Sign In
            </button>
            <button
              v-if="isAuthenticated"
              @click="showProfileModal = true"
              class="bg-white/50 hover:bg-white text-black font-bold p-2 rounded-full aspect-square flex items-center justify-center"
              :title="currentUser?.displayName || 'Profile'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
            <button @click="showShareModal = true" class="bg-white/50 hover:bg-white text-black font-bold p-2 rounded-full aspect-square flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            </button>
            <button @click="showRawModal = true" class="bg-white/50 hover:bg-white text-black font-bold p-2 rounded-full aspect-square flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Lazy-loaded Avatars view (code-split) -->
      <main v-if="currentView === 'avatars'" class="w-full flex-grow">
        <component v-if="AvatarsView" :is="AvatarsView" />
        <div v-else class="w-full flex-grow flex items-center justify-center p-8 text-gray-500">Loading avatars...</div>
      </main>

       <main v-if="currentView === 'audiobook'" class="w-full flex-grow">
         <component v-if="AudiobookView" :is="AudiobookView" />
         <div v-else class="w-full flex-grow flex items-center justify-center p-8 text-gray-500">Loading audiobook...</div>
       </main>
       <main v-if="currentView === 'sentry-test'" class="w-full flex-grow bg-white/50 rounded-wow">
         <SentryTestPage />
       </main>
        <!-- Step 1: Upload -->
        <div v-if="audiobookState.step === 'upload'" class="text-center">
          <h2 class="text-2xl font-bold mb-2">Audiobook Creator</h2>
          <p class="mb-4 text-black/60">Upload a chapter (.txt file) to get started.</p>
          <label class="bg-black text-white px-6 py-3 rounded-full font-bold cursor-pointer hover:bg-black/80 transition-colors">
            Upload Chapter
            <input type="file" @change="handleFileUpload" accept=".txt" class="hidden">
          </label>
           <p v-if="audiobookState.error" class="text-red-500 mt-4 max-w-md">{{ audiobookState.error }}</p>
        </div>

        <!-- Step 2: Parsing -->
        <div v-if="audiobookState.step === 'parsing'" class="text-center">
          <div class="relative w-16 h-16 mx-auto">
            <div class="absolute inset-0 border-8 border-black/20 rounded-full"></div>
            <div class="absolute inset-0 border-8 border-black rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p class="mt-4 font-bold">Analyzing chapter, designing characters, and creating script...</p>
        </div>

        <!-- Step 3: Editing -->
        <div v-if="audiobookState.step === 'editing'" class="w-full h-full flex flex-col gap-4 overflow-hidden">
            <div class="flex-shrink-0 flex justify-between items-center">
                <div class="flex items-baseline gap-4">
                    <h2 class="text-xl font-bold">Production Studio</h2>
                    <p class="text-sm text-black/60">{{ audiobookState.fileName }}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="generateFullAudiobook" class="bg-black text-white font-bold py-2 px-5 rounded-full hover:bg-black/80">Generate Full Chapter</button>
                    <button @click="resetAudiobookCreator" class="bg-gray-200 text-black font-bold py-2 px-4 rounded-full hover:bg-gray-300 text-sm">Start New</button>
                </div>
            </div>
            <div class="flex-shrink-0 bg-black/10 p-1 rounded-full flex text-sm self-start">
                 <button @click="audiobookState.editingTab = 'voices'" class="px-4 py-1.5 rounded-full transition-colors text-sm font-semibold" :class="audiobookState.editingTab === 'voices' ? 'bg-white text-black' : 'hover:bg-black/10'">1. Cast Voices</button>
                 <button @click="audiobookState.editingTab = 'characters'" class="px-4 py-1.5 rounded-full transition-colors text-sm font-semibold" :class="audiobookState.editingTab === 'characters' ? 'bg-white text-black' : 'hover:bg-black/10'">2. Design Characters</button>
                 <button @click="audiobookState.editingTab = 'scenes'" class="px-4 py-1.5 rounded-full transition-colors text-sm font-semibold" :class="audiobookState.editingTab === 'scenes' ? 'bg-white text-black' : 'hover:bg-black/10'">3. Create Scenes</button>
            </div>

            <div class="flex-grow w-full bg-black/5 rounded-2xl p-4 overflow-y-auto">
                <!-- Tab 1: Voices -->
                <div v-if="audiobookState.editingTab === 'voices'">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div v-for="char in audiobookState.characters" :key="char.name" class="bg-white/50 p-3 rounded-xl">
                          <label class="font-bold text-md">{{ char.name }}</label>
                          <select v-model="audiobookState.voiceAssignments[char.name]" class="w-full p-2 mt-1 rounded-lg border-2 border-black/20 bg-white">
                              <option v-for="voice in voiceOptions" :key="voice.name" :value="voice.name">{{ voice.name }}</option>
                          </select>
                      </div>
                    </div>
                </div>
                <!-- Tab 2: Characters -->
                <div v-if="audiobookState.editingTab === 'characters'">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="char in audiobookState.characters" :key="char.name" class="bg-white/50 p-4 rounded-xl flex flex-col gap-3">
                            <h3 class="text-lg font-bold">{{ char.name }}</h3>
                            <p class="text-sm bg-black/5 p-2 rounded-md">{{ char.description }}</p>
                            <div class="flex gap-4">
                                <div class="flex-grow w-1/2">
                                    <label class="font-bold text-xs">Art Style</label>
                                    <select v-model="char.style" class="w-full p-2 mt-1 rounded-lg border-2 border-black/20 bg-white text-sm">
                                        <option v-for="style in ART_STYLES" :key="style" :value="style">{{ style }}</option>
                                    </select>
                                    <label class="font-bold text-xs mt-2 block">Image Prompt</label>
                                    <textarea v-model="char.prompt" rows="6" class="w-full p-2 mt-1 rounded-lg border-2 border-black/20 bg-white text-xs font-mono"></textarea>
                                    <button @click="generateAudiobookImage(char)" class="w-full mt-2 bg-purple text-white font-bold py-2 rounded-full text-sm hover:bg-purple/80" :disabled="char.isLoading">
                                        {{ char.isLoading ? 'Generating...' : 'Generate Portrait' }}
                                    </button>
                                </div>
                                <div class="w-1/2 aspect-square bg-black/10 rounded-lg flex items-center justify-center overflow-hidden">
                                     <div v-if="char.isLoading" class="relative w-10 h-10">
                                        <div class="absolute inset-0 border-4 border-black/20 rounded-full"></div>
                                        <div class="absolute inset-0 border-4 border-purple rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <img v-else-if="char.imageUrl" :src="char.imageUrl" class="w-full h-full object-cover"/>
                                    <p v-else class="text-xs text-black/40">Image will appear here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Tab 3: Scenes -->
                <div v-if="audiobookState.editingTab === 'scenes'">
                     <div v-for="(item, index) in audiobookScriptWithScenes" :key="index" class="mb-2">
                        <div v-if="item.type === 'line'" class="flex items-center gap-3 p-2 rounded-lg hover:bg-black/10">
                           <button @click="playPreviewLine(item.data, index)" class="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center" :class="audiobookState.currentlyPlayingLine === index ? 'bg-purple text-white' : 'bg-white'">
                              <svg v-if="audiobookState.currentlyPlayingLine === index" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                           </button>
                           <p class="text-sm"><strong class="mr-2">{{ item.data.character }}:</strong>{{ item.data.line }}</p>
                        </div>
                        <div v-else-if="item.type === 'scene'" class="bg-white/50 my-4 p-4 rounded-xl border-l-4 border-purple">
                            <h4 class="font-bold text-purple mb-2">Scene Illustration</h4>
                            <div class="flex gap-4">
                               <div class="flex-grow w-1/2">
                                    <label class="font-bold text-xs mt-2 block">Image Prompt</label>
                                    <textarea v-model="item.data.prompt" rows="8" class="w-full p-2 mt-1 rounded-lg border-2 border-black/20 bg-white text-xs font-mono"></textarea>
                                    <button @click="generateAudiobookImage(item.data)" class="w-full mt-2 bg-purple text-white font-bold py-2 rounded-full text-sm hover:bg-purple/80" :disabled="item.data.isLoading">
                                        {{ item.data.isLoading ? 'Generating...' : 'Generate Scene' }}
                                    </button>
                                </div>
                                <div class="w-1/2 aspect-square bg-black/10 rounded-lg flex items-center justify-center overflow-hidden">
                                     <div v-if="item.data.isLoading" class="relative w-10 h-10">
                                        <div class="absolute inset-0 border-4 border-black/20 rounded-full"></div>
                                        <div class="absolute inset-0 border-4 border-purple rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <img v-else-if="item.data.imageUrl" :src="item.data.imageUrl" class="w-full h-full object-cover"/>
                                    <p v-else class="text-xs text-black/40">Image will appear here</p>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>

        <!-- Step 4 & 5: Generating & Finished -->
        <div v-if="audiobookState.step === 'generating' || audiobookState.step === 'finished'" class="w-full max-w-lg text-center">
            <h2 class="text-2xl font-bold mb-4">{{ audiobookState.step === 'generating' ? 'Generating Your Audiobook' : 'Your Audiobook is Ready!' }}</h2>
            
            <div v-if="audiobookState.step === 'generating'" class="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div class="bg-purple h-4 rounded-full" :style="{ width: audiobookState.generationProgress + '%' }"></div>
            </div>
            <p v-if="audiobookState.step === 'generating'" class="mb-4">Please wait, this may take a few minutes...</p>

            <div v-if="audiobookState.step === 'finished'">
                <audio controls :src="audiobookState.finalAudioUrl" class="w-full mb-4"></audio>
                <div class="flex gap-4">
                  <button @click="downloadAudioFile" class="flex-1 bg-black text-white font-bold py-3 rounded-full hover:bg-black/80">Download .WAV</button>
                  <button @click="resetAudiobookCreator" class="flex-1 bg-gray-200 text-black font-bold py-3 rounded-full hover:bg-gray-300">Create New Chapter</button>
                </div>
            </div>
        </div>

      </main>

      <div v-if="isPlayerVisible && isSmallScreen" class="fixed bottom-0 left-0 right-0 bg-blue p-2 border-t-2 border-white/50">
        <button @click="isPlayerVisible = false" class="w-full bg-white text-black p-3 rounded-2xl font-bold">Show Controls</button>
      </div>

      <LiveAudioComponent ref="liveAudioRef" @no-audio="handleNoAudio" @speaking-start="handleSpeakingStart" @extended-quiet="handleExtendedQuiet" @quota-exceeded="handleQuotaExceeded" />

      <!-- Share Modal -->
      <transition name="fade">
        <div v-if="showShareModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="showShareModal = false">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md" @click.stop>
            <h2 class="text-2xl font-bold mb-4">Share Character</h2>
            <p class="mb-4">Share a link to this specific character configuration.</p>
            <div class="flex space-x-2">
              <input type="text" :value="getShareUrl()" readonly class="flex-grow bg-gray-100 rounded-lg px-3 border border-gray-300">
              <button @click="copyToClipboard" class="bg-purple text-white px-4 py-2 rounded-lg font-bold">{{ isCopied ? 'Copied!' : 'Copy' }}</button>
            </div>
          </div>
        </div>
      </transition>
      
      <!-- Raw Prompts Modal -->
      <transition name="fade">
        <div v-if="showRawModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click="showRawModal = false">
          <div class="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" @click.stop>
            <h2 class="text-2xl font-bold mb-4">Raw Prompts</h2>
            <div class="space-y-4">
              <div>
                <h3 class="font-bold">Voice Prompt:</h3>
                <p class="bg-gray-100 rounded-lg p-3 text-sm font-mono">{{ actualVoicePrompt }}</p>
              </div>
              <div>
                <h3 class="font-bold">Image Prompt:</h3>
                <p class="bg-gray-100 rounded-lg p-3 text-sm font-mono">{{ actualImagePrompt }}</p>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Auth Modal -->
      <AuthModal
        :show="showAuthModal"
        :initialMode="authMode"
        @close="showAuthModal = false"
        @authenticated="showAuthModal = false"
      />

      <!-- User Profile Modal -->
      <UserProfile
        :show="showProfileModal"
        :user="currentUser"
        @close="showProfileModal = false"
        @signedOut="showProfileModal = false"
      />
    </div>
`
});
const app = createApp(ImagineComponent);

// Initialize Sentry (safe no-op when DSN not provided)
try {
  // lazy import local helper to avoid large bundle impact
  import('./src/sentry').then(({ initSentry }) => {
    try {
      // call but do not block mounting if Sentry slow
      void initSentry(app).catch((e: any) => {
        // eslint-disable-next-line no-console
        console.warn('Sentry init failed:', e?.message || e);
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Sentry helper threw:', e?.message || e);
    }
  }).catch((err) => {
    // ignore failure to load helper in constrained environments
  });
} catch (e) {
  // ignore on platforms that can't require()
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Validate environment configuration before mounting
validateEnvironment();

app.mount('#app');

// Development-only: expose a test error trigger to validate Sentry setup
if ((import.meta.env.MODE || 'development') !== 'production') {
  (window as any).triggerTestError = function triggerTestError() {
    // eslint-disable-next-line no-throw-literal
    throw new Error('Sentry test error - ChunkFlow test');
  };
}