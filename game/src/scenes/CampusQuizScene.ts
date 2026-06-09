import Phaser from 'phaser';
import { getBio } from '../data/bioLoader';
import { AudioManager } from '../systems/AudioManager';

interface Question {
  question: string;
  options: string[];
  correct: number;
}

export class CampusQuizScene extends Phaser.Scene {
  private questions: Question[] = [];
  private qIndex = 0;
  private score = 0;
  private total = 0;
  private questionText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private done = false;

  constructor() {
    super({ key: 'CampusQuizScene' });
  }

  create(): void {
    this.qIndex = 0;
    this.score = 0;
    this.done = false;
    this.optionTexts = [];

    const { width, height } = this.scale;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0f1a0f');

    this.buildQuestions();
    this.total = this.questions.length;

    // Title
    this.add.text(width / 2, 25, '✦ CAMPUS QUIZ ✦', {
      fontSize: '22px', color: '#ffaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(width / 2, 55, `Question 1/${this.total}  Score: 0`, {
      fontSize: '13px', color: '#ccaa88', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.questionText = this.add.text(width / 2, height * 0.3, '', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace', align: 'center',
      wordWrap: { width: width * 0.75 },
    }).setOrigin(0.5).setDepth(10);

    this.statusText = this.add.text(width / 2, height * 0.18, '', {
      fontSize: '13px', color: '#aabb88', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.input.keyboard!.on('keydown-ESC', () => this.returnToCampus());

    this.showQuestion();
  }

  private buildQuestions(): void {
    const bio = getBio();
    this.questions = [];

    const shuffleQA = (question: string, correct: string, wrongPool: string[]): Question => {
      const filtered = [...new Set(wrongPool.filter(w => w !== correct))];
      const shuffled = Phaser.Utils.Array.Shuffle([...filtered]);
      const distractors = shuffled.slice(0, 3);
      const opts = [correct, ...distractors];
      while (opts.length < 4) opts.push('None of the above');
      Phaser.Utils.Array.Shuffle(opts);
      return { question, options: opts, correct: opts.indexOf(correct) };
    };

    // Questions about job highlights (which company matches which work description)
    const allCompanies = [...new Set(bio.jobs.map(j => j.company))];
    for (const job of bio.jobs) {
      if (job.highlights.length === 0) continue;
      const hl = job.highlights[Math.floor(Math.random() * job.highlights.length)];
      const clue = hl.length > 55 ? hl.substring(0, 52) + '...' : hl;
      this.questions.push(shuffleQA(
        `"${clue}" — which company?`,
        job.company,
        allCompanies,
      ));
    }

    // Questions about which project uses which tech (projects have tech field)
    const allProjects = bio.projects.map(p => p.title);
    for (const proj of bio.projects) {
      if (proj.tech.length === 0) continue;
      const tech = proj.tech[Math.floor(Math.random() * proj.tech.length)];
      this.questions.push(shuffleQA(
        `Which project uses "${tech}"?`,
        proj.title,
        allProjects,
      ));
    }

    // Education questions
    for (const edu of bio.education) {
      const otherDegrees = bio.education.filter(e => e.id !== edu.id).map(e => e.degree);
      this.questions.push(shuffleQA(
        `What degree did they earn at ${edu.school}?`,
        edu.degree,
        [...new Set(otherDegrees)],
      ));
    }

    Phaser.Utils.Array.Shuffle(this.questions);
    if (this.questions.length > 6) this.questions = this.questions.slice(0, 6);
  }

  private showQuestion(): void {
    if (this.qIndex >= this.questions.length) {
      this.showResults();
      return;
    }

    const q = this.questions[this.qIndex];
    this.questionText.setText(q.question);
    this.scoreText.setText(`Question ${this.qIndex + 1}/${this.total}  Score: ${this.score}`);

    // Clear old option texts
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];

    const { width, height } = this.scale;
    const startY = height * 0.45;
    const gap = 44;
    const correctIdx = q.correct;

    // Shuffle display order but track which index maps to correct
    const indices = [0, 1, 2, 3];
    Phaser.Utils.Array.Shuffle(indices);

    indices.forEach((optIdx, displayIdx) => {
      const y = startY + displayIdx * gap;
      const letter = String.fromCharCode(65 + displayIdx);
      const txt = this.add.text(width / 2, y, `${letter}) ${q.options[optIdx]}`, {
        fontSize: '15px', color: '#cccccc', fontFamily: 'monospace',
        backgroundColor: '#1a2a1a', padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

      txt.on('pointerdown', () => {
        if (this.done) return;
        const isCorrect = optIdx === correctIdx;
        this.answerQuestion(displayIdx, isCorrect);
      });

      txt.on('pointerover', () => { if (!this.done) txt.setColor('#ffffff'); });
      txt.on('pointerout', () => { if (!this.done) txt.setColor('#cccccc'); });

      this.optionTexts.push(txt);
    });
  }

  private answerQuestion(displayIdx: number, correct: boolean): void {
    if (this.done) return;
    this.done = true;

    // Highlight correct/wrong
    for (let i = 0; i < this.optionTexts.length; i++) {
      const txt = this.optionTexts[i];
      if (i === displayIdx) {
        txt.setColor(correct ? '#44ff88' : '#ff4444');
      } else {
        txt.setColor('#666666');
      }
    }

    if (correct) {
      this.score++;
      AudioManager.get().playSfx('step');
      this.statusText.setText('✓ Correct!');
      this.statusText.setColor('#44ff88');
    } else {
      AudioManager.get().playSfx('hover');
      this.statusText.setText('✗ Incorrect');
      this.statusText.setColor('#ff4444');
    }

    this.scoreText.setText(`Question ${this.qIndex + 1}/${this.total}  Score: ${this.score}`);

    this.time.delayedCall(1200, () => {
      this.qIndex++;
      this.done = false;
      this.statusText.setText('');
      this.showQuestion();
    });
  }

  private showResults(): void {
    this.done = true;
    for (const t of this.optionTexts) t.destroy();
    this.optionTexts = [];

    const { width, height } = this.scale;
    const pct = Math.round(this.score / this.total * 100);
    this.questionText.setText(`✦ Quiz Complete! ✦\n\nScore: ${this.score}/${this.total} (${pct}%)`);
    this.questionText.setColor('#44ff88');

    this.statusText.setText('Returning to campus...');
    AudioManager.get().playSfx('interact');

    this.time.delayedCall(3000, () => this.returnToCampus());
  }

  private returnToCampus(): void {
    AudioManager.get().stopBgm(0.2);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.scene.start('EducationCampusScene');
    });
  }
}
