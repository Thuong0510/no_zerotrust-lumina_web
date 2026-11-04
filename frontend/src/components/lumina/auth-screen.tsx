'use client';
import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/client';
import { ErrorBox } from './ui';
export default function AuthScreen({ onLogin, demo }: {
    onLogin: () => void;
    demo: boolean;
}) {
    const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('reset') : null;
    const [mode, setMode] = useState(token ? 'reset' : 'login'), [error, setError] = useState(''), [message, setMessage] = useState(''), [reset, setReset] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
    function switchMode(v: string) { setMode(v); setError(''); setMessage(''); setReset(''); }
    async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); setMessage(''); setBusy(true); const d = Object.fromEntries(new FormData(e.currentTarget)); try {
        const out = await api('auth/' + mode, 'POST', { ...d, remember: d.remember === 'on', terms: d.terms === 'on', token });
        if (mode === 'login')
            onLogin();
        else {
            setMessage(out.message);
            if (out.resetUrl)
                setReset(out.resetUrl);
            if (mode === 'reset') {
                window.history.replaceState(null, '', '/');
                setMode('login');
            }
        }
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    return <main className="auth-layout"><section className="auth-story"><div className="brand light">LUMINA<span>F A S H I O N</span></div><div className="auth-editorial"><div className="eyebrow">YOUR EVERYDAY STYLE</div><h1>Made for you.<br /><em>Styled for every day.</em></h1><p>Khám phá bộ sưu tập và mua sắm cùng LUMINA.<br />Đăng nhập để tiếp tục với tài khoản của bạn.</p></div><div className="fashion-display"><div className="garment garment-one"><svg viewBox="0 0 100 140"><path d="M29 10 8 28 0 51 24 61 30 42 28 128h46l-3-86 6 19 24-10-9-23-22-18-12 6H42z" fill="#c7bca9"/><path d="M43 15 50 34 59 15M50 34v90M32 30l-2 80M70 30l2 80" stroke="#a89a83" fill="none" strokeWidth="1.2"/></svg></div><div className="garment garment-two"><svg viewBox="0 0 100 140"><path d="M24 4h53l7 129H56l-6-83-5 83H17z" fill="#34372f"/><path d="M24 22h53M50 5v42M27 26l-3 12M73 26l4 12" stroke="#777869" strokeWidth="1.3" fill="none"/></svg></div><div className="collection-tag">LUMINA COLLECTION<br /><strong>Collection No. 01</strong></div></div><footer><span>© 2026 LUMINA FASHION</span><span>LUMINA FASHION <ArrowUpRight size={13}/></span></footer></section><section className="auth-form-side"><div className="auth-top">LUMINA FASHION <span>● Tài khoản của bạn</span></div><div className="auth-form"><div className="eyebrow">WELCOME TO LUMINA</div><h2>{mode === 'login' ? 'Chào mừng trở lại.' : mode === 'register' ? 'Tham gia LUMINA.' : mode === 'forgot' ? 'Quên mật khẩu?' : 'Đặt lại mật khẩu.'}</h2><p>{mode === 'login' ? 'Đăng nhập để mua sắm hoặc vào khu vực làm việc theo tài khoản của bạn.' : mode === 'register' ? 'Tạo tài khoản mua sắm. Tài khoản mới cần được cửa hàng duyệt trước khi đăng nhập.' : 'Chúng tôi sẽ giúp bạn truy cập lại tài khoản.'}</p><ErrorBox error={error}/>{message && <div className="success-box">{message}</div>}{reset && <a className="reset-link" href={reset}>Mở email mô phỏng → Đặt lại mật khẩu</a>}<form onSubmit={submit} key={mode}>{mode === 'register' && <><label>Họ và tên<input name="name" required placeholder="Nguyễn Minh Anh" minLength={2}/></label><div className="form-grid"><label>Username<input name="username" required pattern="[a-zA-Z0-9_.-]{3,40}" placeholder="minhanh"/></label><label>Số điện thoại<input name="phone" required pattern="[+0-9 ()-]{8,20}" placeholder="0901234567"/></label></div></>}{mode === 'login' ? <label>Email hoặc username<input autoComplete="username" name="login" required placeholder="admin@lumina.vn"/></label> : mode !== 'reset' && <label>Email<input type="email" name="email" required placeholder="ban@lumina.vn"/></label>}{mode !== 'forgot' && <label>{mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}<div className="password-input"><input type={show ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'login' ? 1 : 8} maxLength={128} placeholder="Nhập mật khẩu"/><button type="button" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>}{['register', 'reset'].includes(mode) && <label>Xác nhận mật khẩu<input name="confirm" type={show ? 'text' : 'password'} required minLength={8} placeholder="Nhập lại mật khẩu"/></label>}{mode === 'login' && <div className="form-options"><label className="checkbox"><input name="remember" type="checkbox"/>Ghi nhớ đăng nhập</label><button className="text-btn" type="button" onClick={() => switchMode('forgot')}>Quên mật khẩu?</button></div>}{mode === 'register' && <label className="checkbox terms"><input type="checkbox" name="terms" required/>Tôi đồng ý chính sách mua hàng và việc sử dụng thông tin để xử lý tài khoản, đơn hàng.</label>}<button className="btn primary full" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Gửi yêu cầu' : 'Lưu mật khẩu mới'}<ArrowRight size={17}/></button></form><div className="auth-switch">{mode === 'login' ? <>Chưa có tài khoản? <button className="text-btn" onClick={() => switchMode('register')}>Đăng ký ngay</button></> : <button className="text-btn" onClick={() => switchMode('login')}>← Quay lại đăng nhập</button>}</div>{demo && mode === 'login' && <div className="demo-box"><ShieldCheck size={18}/><div><strong>Không gian trải nghiệm</strong><p>Tài khoản: admin · employee01 · guest01<br />Dùng mật khẩu DEMO_PASSWORD đã đặt khi khởi tạo.</p></div></div>}</div><div className="auth-bottom">LUMINA FASHION · Together, we make it happen.</div></section></main>;
}
