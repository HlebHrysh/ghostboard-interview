import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

export async function sendRetentionEmail(email: string, name: string = 'Кандидат') {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Mocking email to:', email);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Ghostboard <hi@ghostboard.ai>',
      to: [email],
      subject: '🔥 Твої конкуренти вже тренуються!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2>Привіт, ${name}! 👋</h2>
          <p>Ми помітили, що ти не заходив на Ghostboard вже кілька днів.</p>
          <p>Сьогодні <strong>142 кандидати</strong> успішно пройшли AI-співбесіди на твою позицію і покращили свої навички. Конкуренція на ринку дуже висока, тому важливо тримати себе в тонусі!</p>
          <p>Повертайся та пройди хоча б одне швидке мок-інтерв'ю на 3 запитання, щоб освіжити знання.</p>
          <a href="https://ghostboard.ai/interview" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Почати тренування</a>
          <p style="margin-top: 32px; font-size: 12px; color: #777;">Якщо ви не хочете отримувати ці листи, ви можете відписатися в налаштуваннях.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send email via Resend:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Resend Exception:', error);
    return { success: false, error };
  }
}
