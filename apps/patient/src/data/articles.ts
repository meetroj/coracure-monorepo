import DrRichardImg from '../assets/dr-richard-parker.jpg';
import DrNehaImg from '../assets/dr-neha-sharma.jpg';
import KneeJointImg from '../assets/knee-joint.jpg';
import MentalHealthImg from '../assets/mental-health.jpg';
import SleepScienceImg from '../assets/sleep-science.jpg';

/**
 * The Blogs & Articles catalogue — the list cards and the reading view read
 * from this one source, so a card always opens the article it names.
 *
 * ponytail: mock content; swap for the content endpoint
 * (`apps/backend/coracure_backend/src/content`) when it lands. General
 * recovery education only — nothing here names a diagnosis.
 */

export interface Article {
  id: string;
  category: string;
  title: string;
  author: string;
  readTime: string;
  thumbnail: any;
  /** Shown on the list as a featured hero card. */
  featured?: boolean;
  /** Shown in the Trending Topics strip. */
  trending?: boolean;
  reads?: string;
  /** Standfirst under the title in the reading view. */
  summary: string;
  /** The reading view renders these as `## heading` / paragraph pairs. */
  body: { heading: string; text: string }[];
}

export const ARTICLES: Article[] = [
  {
    id: 'f1',
    category: 'REHABILITATION',
    title: 'Knee Recovery 101: What To Expect In Month 1',
    author: 'Dr. Richard Parker',
    readTime: '5 min read',
    thumbnail: MentalHealthImg,
    featured: true,
    summary:
      'The first four weeks set the tone for the rest of your recovery. Here is what a typical month looks like, and when to call your care team.',
    body: [
      {
        heading: 'Week 1 — settle and protect',
        text: 'Swelling and stiffness are expected in the first days. Keep the leg elevated when resting, use the ice routine your care team gave you, and move within the limits you were told. Short, frequent movement beats one long session.',
      },
      {
        heading: 'Week 2 — restore range',
        text: 'Most of this week is about getting the knee bending and straightening again. Straightening fully matters more than people expect: a knee that does not straighten changes how you walk and makes the rest of recovery harder.',
      },
      {
        heading: 'Weeks 3 and 4 — build strength',
        text: 'Gentle strengthening starts once range is improving. Expect good days and flat days. Soreness that settles overnight is normal; soreness that builds day after day means you are moving faster than the tissue is healing.',
      },
      {
        heading: 'When to contact your care team',
        text: 'Get in touch if swelling suddenly increases, if pain wakes you at night when it had stopped, if you develop a fever, or if the knee gives way. These are not things to wait out — message your doctor through the app.',
      },
    ],
  },
  {
    id: '1',
    category: 'REHABILITATION',
    title: '10 Exercises To Strengthen Your Quads at Home',
    author: 'Dr. Richard Parker',
    readTime: '4 min read',
    thumbnail: DrRichardImg,
    summary:
      'Strong quadriceps take load off the knee joint. These ten movements need no equipment and fit into ten minutes.',
    body: [
      {
        heading: 'Why quads matter',
        text: 'The quadriceps absorb much of the force that would otherwise go through the knee joint when you stand, walk and climb stairs. Building them back is one of the most reliable ways to make everyday movement feel easier.',
      },
      {
        heading: 'The ten movements',
        text: 'Quad sets, straight-leg raises, short-arc quads, heel slides, seated knee extensions, wall sits, sit-to-stands, step-ups, mini squats and terminal knee extensions. Start with two sets of ten and add a set once the last repetition still feels controlled.',
      },
      {
        heading: 'How hard is hard enough',
        text: 'You should finish a set feeling you could have done two or three more. Working to failure does not speed recovery up and usually costs you the next day.',
      },
      {
        heading: 'Stop and check in if',
        text: 'A movement causes sharp pain, the knee swells after a session and has not settled by morning, or you feel the joint catching. Bring it up at your next consultation rather than pushing through.',
      },
    ],
  },
  {
    id: '2',
    category: 'MENTAL WELLNESS',
    title: 'How Mental Health Impacts Physical Healing',
    author: 'Dr. Neha Sharma',
    readTime: '6 min read',
    thumbnail: DrNehaImg,
    summary:
      'Sleep, stress and mood are not side issues during recovery — they change how quickly tissue heals and how much pain you feel.',
    body: [
      {
        heading: 'Stress and pain share a dial',
        text: 'Sustained stress raises the body’s baseline alertness, and a more alert nervous system reports pain more loudly. The injury has not changed; the volume has. This is why the same knee can feel worse in a difficult week.',
      },
      {
        heading: 'Sleep is repair time',
        text: 'Most tissue repair happens during deep sleep. Broken nights slow healing and lower pain tolerance the next day, which makes rehab harder, which costs more sleep. Protecting sleep breaks that loop.',
      },
      {
        heading: 'What actually helps',
        text: 'A consistent sleep and wake time, daylight early in the day, movement you enjoy, and talking to someone rather than managing alone. Small and repeated beats large and occasional.',
      },
      {
        heading: 'Asking for support',
        text: 'If low mood or anxiety has lasted more than a couple of weeks, raise it with your doctor in the app. It is part of your recovery, not a separate problem.',
      },
    ],
  },
  {
    id: '3',
    category: 'CLINICAL SCIENCE',
    title: 'The Role of Collagen in Joint Repair',
    author: 'CoraCure Ortho Team',
    readTime: '5 min read',
    thumbnail: KneeJointImg,
    summary:
      'Collagen is the scaffold your joints are built from. Here is what the evidence does and does not say about supporting it.',
    body: [
      {
        heading: 'What collagen does',
        text: 'Collagen forms the fibrous framework of tendon, ligament and cartilage. Repair after an injury is largely the slow work of laying down new collagen and then remodelling it so the fibres line up with the load they carry.',
      },
      {
        heading: 'Why loading matters',
        text: 'New collagen organises itself in response to controlled load. This is the reason rehab is progressive movement rather than rest: the tissue needs a signal to know which direction to grow in.',
      },
      {
        heading: 'On supplements',
        text: 'Evidence for collagen supplements is mixed and the effect sizes reported are small. Adequate overall protein, vitamin C and enough calories are better established. Check with your doctor before adding any supplement.',
      },
      {
        heading: 'The honest timeline',
        text: 'Remodelling continues for months after the point where a joint feels normal. Feeling better is a milestone, not the finish line — keep to the plan your care team set.',
      },
    ],
  },
  {
    id: 't1',
    category: 'REHABILITATION',
    title: 'Post-Op Physical Therapy',
    author: 'Clinical Staff',
    readTime: '4 min read',
    thumbnail: SleepScienceImg,
    trending: true,
    reads: '1.2k reads',
    summary:
      'What physiotherapy after surgery is for, what a session involves, and how to get the most out of the ones you have.',
    body: [
      {
        heading: 'What it is for',
        text: 'Post-operative physiotherapy restores range of movement, rebuilds the strength lost while you were resting, and retrains the everyday patterns — walking, stairs, sitting down — that the surgery interrupted.',
      },
      {
        heading: 'What a session looks like',
        text: 'Usually an assessment of how you have moved since the last visit, hands-on work on stiffness, then a set of exercises you will repeat at home. The home work is where most of the progress comes from.',
      },
      {
        heading: 'Getting more out of it',
        text: 'Keep a short note of what you did between sessions and what hurt. Specifics let your physiotherapist adjust the plan rather than guess.',
      },
    ],
  },
  {
    id: 't2',
    category: 'NUTRITION',
    title: 'Joint Nutrition Guidelines',
    author: 'Clinical Staff',
    readTime: '3 min read',
    thumbnail: MentalHealthImg,
    trending: true,
    reads: '980 reads',
    summary:
      'General eating guidance that supports recovery — no restrictive plans, no single miracle food.',
    body: [
      {
        heading: 'Protein first',
        text: 'Repair needs building blocks. Spreading protein across the day rather than loading it into one meal makes it easier for the body to use.',
      },
      {
        heading: 'Do not undereat',
        text: 'Recovery costs energy. Cutting calories sharply during rehab slows healing and leaves you with nothing in the tank for sessions.',
      },
      {
        heading: 'Keep it boring',
        text: 'Vegetables, fruit, whole grains, enough water. The evidence supports the unglamorous version far more strongly than it supports any specific supplement.',
      },
      {
        heading: 'Before you change anything',
        text: 'If you have a condition that affects your diet, or you take regular medication, talk to your doctor before making changes.',
      },
    ],
  },
];

export const articleById = (id?: string) => ARTICLES.find((a) => a.id === id);
