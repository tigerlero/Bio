export class ModalPanel {
  private overlay: HTMLElement;
  private body: HTMLElement;
  private closeBtn: HTMLElement;
  private isOpen = false;

  constructor() {
    this.overlay = document.getElementById('modal-overlay')!;
    this.body = document.getElementById('modal-body')!;
    this.closeBtn = document.getElementById('modal-close')!;
    this.closeBtn.onclick = () => this.close();
    this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.close(); });
  }

  show(html: string): void {
    this.body.innerHTML = html.replace(/\n/g, '<br>');
    this.overlay.style.display = 'block';
    this.isOpen = true;
  }

  close(): void {
    this.overlay.style.display = 'none';
    this.isOpen = false;
  }

  getIsOpen(): boolean { return this.isOpen; }
}
