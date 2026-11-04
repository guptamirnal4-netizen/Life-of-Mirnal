// One featured school event per class, announced at morning assembly.
// effect: rep = school reputation, cert = certificate title, friend = friendship bonus with everyone.

export const YEAR_EVENTS = {
  1: {
    name: "Children's Day", when: '14 November',
    intro: "It's Children's Day! The teachers are putting on a show for you, and there's a fancy-dress parade.",
    choices: [
      { label: 'Join the fancy-dress parade as a tree', text: 'You waddle across the stage as a very proud tree. Everyone claps.', effect: { rep: 3, cert: 'Fancy Dress Participant' } },
      { label: 'Sit with friends and cheer', text: 'You cheer the loudest when the teachers dance.', effect: { friend: 2 } },
    ],
  },
  2: {
    name: 'Independence Day', when: '15 August',
    intro: 'Independence Day assembly! The flag will be hoisted and the choir needs more voices.',
    choices: [
      { label: 'Sing in the choir', text: 'You sing "Saare Jahan Se Achha" with the choir. Your voice wobbles once, but you keep going.', effect: { rep: 4, cert: 'Independence Day Choir' } },
      { label: 'Help hand out sweets afterwards', text: 'You hand out laddoos to the little ones.', effect: { rep: 2, friend: 1 } },
    ],
  },
  3: {
    name: 'Sports Day', when: 'December',
    intro: 'Sports Day is here! The sack race needs participants.',
    choices: [
      { label: 'Enter the sack race', text: 'You fall once, get up, and finish third!', effect: { rep: 4, cert: 'Sports Day: Sack Race (3rd)' } },
      { label: 'Volunteer to carry water for runners', text: 'You keep the runners going all morning.', effect: { rep: 2, friend: 2 } },
    ],
  },
  4: {
    name: 'Annual Day', when: 'January',
    intro: "Annual Day rehearsals start today. The class play needs actors, and backstage needs helpers.",
    choices: [
      { label: 'Audition for the play', text: 'You get the role of the clever crow! You practise your lines every day.', effect: { rep: 5, cert: 'Annual Day: Class Play' } },
      { label: 'Paint the backdrop', text: 'Your painted forest becomes the stage background.', effect: { rep: 3, friend: 1 } },
    ],
  },
  5: {
    name: "Teachers' Day", when: '5 September',
    intro: "Teachers' Day! Students are making cards and some will teach a junior class for a period.",
    choices: [
      { label: 'Teach Class 1 for one period', text: 'You teach the little ones counting. It is harder than it looks!', effect: { rep: 5, cert: "Teachers' Day Student Teacher" } },
      { label: 'Make cards for every teacher', text: 'Your class teacher keeps your card on the staff room board.', effect: { rep: 3 } },
    ],
  },
  6: {
    name: 'Republic Day', when: '26 January',
    intro: 'Republic Day: the march past needs a flag bearer for your house.',
    choices: [
      { label: 'Volunteer as flag bearer', text: 'You practise marching for two weeks. On the day, you are perfectly in step.', effect: { rep: 5, cert: 'Republic Day March Past' } },
      { label: 'Recite a poem on the Constitution', text: 'You recite a poem about equality and freedom.', effect: { rep: 4, cert: 'Republic Day Recitation' } },
      { label: 'Just watch this year', text: 'You watch from the stands and clap for your house.', effect: {} },
    ],
  },
  7: {
    name: 'Science Exhibition', when: 'November',
    intro: 'The inter-school Science Exhibition is open for entries.',
    choices: [
      { label: 'Build a rainwater harvesting model', text: 'Your model actually filters water. A judge asks three questions and you answer all of them.', effect: { rep: 6, cert: 'Science Exhibition: Rainwater Model' } },
      { label: 'Team up with friends on a solar oven', text: 'Your solar oven melts chocolate in 20 minutes. Teamwork!', effect: { rep: 4, friend: 3, cert: 'Science Exhibition: Team Entry' } },
      { label: 'Skip it this year', text: 'You visit the exhibition and take notes for next time.', effect: {} },
    ],
  },
  8: {
    name: 'Inter-house Debate', when: 'August',
    intro: 'Inter-house debate: "Should homework be banned?" Your house needs a speaker.',
    choices: [
      { label: 'Speak FOR the motion', text: 'You argue that practice can happen in class. The crowd cheers.', effect: { rep: 5, cert: 'Inter-house Debate Speaker' } },
      { label: 'Speak AGAINST the motion', text: 'You argue that homework builds habits. The judges like your examples.', effect: { rep: 5, cert: 'Inter-house Debate Speaker' } },
      { label: 'Help research arguments', text: 'Your research notes help your house win.', effect: { rep: 3, friend: 2 } },
    ],
  },
  9: {
    name: 'Sports Day', when: 'December',
    intro: 'Sports Day: the 4×100 m relay team needs one more runner.',
    choices: [
      { label: 'Run the relay', text: 'You run the third leg and pass the baton cleanly. Your house finishes second!', effect: { rep: 5, cert: 'Sports Day: Relay (2nd)' } },
      { label: 'Be a volunteer judge', text: 'You stand at the finish line with a stopwatch all day.', effect: { rep: 3 } },
    ],
  },
  10: {
    name: 'Annual Day', when: 'January',
    intro: 'Annual Day: the school needs two student anchors for the evening show.',
    choices: [
      { label: 'Volunteer as anchor', text: 'You host the show in front of 500 parents. Your hands shake, your voice does not.', effect: { rep: 6, cert: 'Annual Day Anchor' } },
      { label: 'Focus on board exam prep', text: 'You attend the show as audience and go home early to revise.', effect: {} },
    ],
  },
  11: {
    name: "Teachers' Day", when: '5 September',
    intro: "Teachers' Day: seniors run the school for a day. You can be a teacher for a junior class.",
    choices: [
      { label: 'Teach Class 8 a topic from your stream', text: 'You explain your favourite topic to Class 8. Two students say they want to take your stream.', effect: { rep: 6, cert: "Teachers' Day: Senior Student Teacher" } },
      { label: 'Organise the teachers\' celebration', text: 'You plan the games and cake for the staff room.', effect: { rep: 4, friend: 2 } },
    ],
  },
  12: {
    name: 'Farewell', when: 'February',
    intro: 'Class 11 is throwing your farewell party. This is your last event as a student here.',
    choices: [
      { label: 'Give a farewell speech', text: 'You thank your teachers, your friends and the canteen uncle. Half the hall is in tears.', effect: { rep: 6, cert: 'Farewell Speech' } },
      { label: 'Dance with your whole class', text: 'Your class performs one last dance together. Nobody remembers the steps, everyone remembers the night.', effect: { friend: 5 } },
    ],
  },
  13: {
    name: 'Oasis', when: 'around Dussehra/Diwali',
    intro: 'It’s Oasis, BITS Pilani’s cultural festival. The campus is lit up, bands are sound-checking, and every club is looking for first-years.',
    choices: [
      { label: 'Perform with Zoya’s dance group', text: 'Three weeks of night rehearsals, one shaky start, and then the whole crowd claps along. Your first Oasis on stage!', effect: { rep: 5, friend: 2, cert: 'Oasis: Dance performance' } },
      { label: 'Volunteer with the organising team', text: 'You run between venues with a walkie-talkie all night, and see how a festival this big actually works.', effect: { rep: 4, cert: 'Oasis: Organising volunteer' } },
      { label: 'Enjoy the shows with friends', text: 'Concert, street food and a 2 a.m. walk back with your batchmates. The kind of night you remember.', effect: { friend: 3 } },
    ],
  },
  14: {
    name: 'APOGEE', when: 'March',
    intro: 'APOGEE, the technical festival, is here: talks, competitions and project exhibitions all over campus.',
    choices: [
      { label: 'Enter a data-analysis competition with Ira', text: 'You clean a messy dataset at midnight and present your insights. You don’t win, but a judge asks for your notebook.', effect: { rep: 5, friend: 2, cert: 'APOGEE: Data-analysis competition' } },
      { label: 'Help Rahul’s team build a line-follower robot', text: 'You handle the wiring and the testing log. The robot finishes the track on its third try!', effect: { rep: 4, friend: 2, cert: 'APOGEE: Robotics team member' } },
      { label: 'Attend talks and exhibitions', text: 'You fill half a notebook with ideas, including one about how data could improve plant maintenance.', effect: { rep: 2 } },
    ],
  },
};
