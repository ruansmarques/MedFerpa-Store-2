import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { PRODUCTS } from './constants';

// --- Types ---
type CartItem = {
  id: number;
  name: string;
  price: number;
  size: string;
  color: string;
  img: string;
  quantity: number;
};

// --- Global Components ---
const Logo = () => (
  <span className="font-extrabold text-2xl tracking-tighter cursor-pointer" onClick={() => window.location.hash = ''}>
    MEDFERPA<span className="text-blue-600">.</span>
  </span>
);

const Button = ({ children, onClick, className = "", variant = "primary", disabled = false }: any) => {
  const base = "px-6 py-3 font-bold rounded-lg transition-all disabled:opacity-50";
  const variants: any = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black border border-black hover:bg-gray-50",
    blue: "bg-blue-600 text-white hover:bg-blue-700"
  };
  return <button disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

// --- App Root ---
export const App = () => {
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || 'home');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    const savedCart = localStorage.getItem('medferpa_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('product/')) {
        setSelectedProductId(Number(hash.split('/')[1]));
        setRoute('product');
      } else {
        setRoute(hash || 'home');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('medferpa_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id && i.size === item.size && i.color === item.color);
      if (exists) return prev.map(i => i === exists ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, item];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const updateQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i === index) return { ...item, quantity: Math.max(1, item.quantity + delta) };
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex space-x-8 font-bold text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-blue-600">Novidades</a>
            <a href="#" className="hover:text-blue-600">Masculino</a>
            <a href="#" className="hover:text-blue-600">Feminino</a>
          </nav>
          <div className="flex items-center space-x-5">
            <button onClick={() => setIsCartOpen(true)} className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
            <button onClick={() => window.location.hash = user ? 'dashboard' : 'login'}>
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 rounded-full border-2 border-black" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {route === 'home' && <HomeView />}
        {route === 'product' && <ProductDetailView productId={selectedProductId} onAddToCart={addToCart} />}
        {route === 'login' && <LoginView />}
        {route === 'dashboard' && <DashboardView user={user} />}
        {route === 'checkout' && <CheckoutView cart={cart} user={user} total={cartTotal} onOrderPlaced={() => setCart([])} />}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsCartOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-extrabold text-xl">SEU CARRINHO</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-2xl">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Carrinho vazio</p>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex space-x-4">
                    <img src={item.img} className="w-20 h-24 object-cover rounded bg-gray-100" />
                    <div className="flex-grow">
                      <h4 className="font-bold text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500 uppercase">{item.color} | {item.size}</p>
                      <div className="flex items-center mt-2 space-x-3">
                        <div className="flex items-center border rounded">
                          <button onClick={() => updateQty(idx, -1)} className="px-2 py-1">-</button>
                          <span className="px-2 text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(idx, 1)} className="px-2 py-1">+</button>
                        </div>
                        <button onClick={() => removeFromCart(idx)} className="text-xs text-red-500 font-bold">REMOVER</button>
                      </div>
                    </div>
                    <p className="font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between font-extrabold text-lg mb-4">
                <span>SUBTOTAL</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
              <Button 
                onClick={() => { setIsCartOpen(false); window.location.hash = 'checkout'; }} 
                className="w-full"
                disabled={cart.length === 0}
              >
                FINALIZAR COMPRA
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="bg-black text-white py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div><Logo /><p className="mt-4 text-gray-400 text-sm">Peças essenciais para uma vida em movimento.</p></div>
          <div><h4 className="font-bold mb-4 uppercase text-xs tracking-widest">Dúvidas</h4><div className="flex flex-col space-y-2 text-sm text-gray-400"><a href="#">Trocas</a><a href="#">FAQ</a></div></div>
          <div><h4 className="font-bold mb-4 uppercase text-xs tracking-widest">Sobre</h4><div className="flex flex-col space-y-2 text-sm text-gray-400"><a href="#">Tecnologia</a><a href="#">Missão</a></div></div>
          <div>
            <h4 className="font-bold mb-4 uppercase text-xs tracking-widest">Novidades</h4>
            <div className="flex"><input type="text" placeholder="WhatsApp" className="bg-gray-900 border-none px-4 py-2 w-full text-sm rounded-l-lg" /><button className="bg-white text-black font-bold px-4 rounded-r-lg text-xs">OK</button></div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Views ---

const HomeView = () => {
  return (
    <div>
      <section className="relative h-[70vh] bg-gray-200 overflow-hidden">
        <img src="https://placehold.co/1920x1080?text=CAMPANHA+2024" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 flex flex-col justify-center items-center text-white text-center px-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">TECHWEAR REINVENTADO</h1>
          <Button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} variant="secondary" className="!bg-white !text-black border-none">VER COLEÇÃO</Button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex justify-between items-end mb-12">
          <div><h2 className="text-3xl font-extrabold tracking-tighter">ESSENCIAIS</h2><p className="text-gray-500">Tecnologia que eleva o dia a dia.</p></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRODUCTS.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => window.location.hash = `product/${p.id}`}>
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg">
                <img src={p.colors[0].images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {p.badges.map(b => <span key={b} className="bg-white text-[10px] font-black px-2 py-1 rounded shadow-sm">{b}</span>)}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="font-bold">{p.name}</h3>
                <p className="text-gray-900 font-extrabold">R$ {p.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProductDetailView = ({ productId, onAddToCart }: any) => {
  const product = PRODUCTS.find(p => p.id === productId);
  const [selectedColor, setSelectedColor] = useState(product?.colors[0]);
  const [selectedSize, setSelectedSize] = useState('');
  const [mainImg, setMainImg] = useState(product?.colors[0].images[0]);

  useEffect(() => {
    if (product) {
        setSelectedColor(product.colors[0]);
        setMainImg(product.colors[0].images[0]);
    }
    window.scrollTo(0,0);
  }, [productId]);

  if (!product) return <div className="p-20 text-center">Produto não encontrado</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
            <img src={mainImg} className="w-full h-full object-cover" />
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {selectedColor?.images.map((img, i) => (
              <img key={i} src={img} onClick={() => setMainImg(img)} className={`w-24 h-32 object-cover cursor-pointer rounded border-2 ${mainImg === img ? 'border-black' : 'border-transparent'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{product.model}</p>
            <h1 className="text-4xl font-extrabold tracking-tighter">{product.name}</h1>
            <p className="text-2xl font-black mt-4">R$ {product.price.toFixed(2)}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-bold">COR: <span className="text-gray-500 uppercase">{selectedColor?.name}</span></p>
            <div className="flex space-x-3">
              {product.colors.map(c => (
                <button 
                  key={c.name} 
                  onClick={() => { setSelectedColor(c); setMainImg(c.images[0]); }}
                  className={`w-10 h-10 rounded-full border-2 p-0.5 ${selectedColor?.name === c.name ? 'border-black' : 'border-transparent'}`}
                >
                  <div className="w-full h-full rounded-full" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><p className="text-sm font-bold">TAMANHO</p> <button className="text-xs underline font-bold">Guia de medidas</button></div>
            <div className="grid grid-cols-4 gap-2">
              {product.sizes.map(s => (
                <button 
                  key={s} 
                  onClick={() => setSelectedSize(s)}
                  className={`py-3 text-sm font-bold border rounded-lg transition-all ${selectedSize === s ? 'bg-black text-white border-black' : 'bg-white hover:border-black'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full !py-5 text-lg" 
            onClick={() => onAddToCart({ ...product, size: selectedSize, color: selectedColor?.name, img: mainImg, quantity: 1 })}
            disabled={!selectedSize}
          >
            ADICIONAR AO CARRINHO
          </Button>

          <div className="bg-gray-50 p-6 rounded-xl space-y-4">
            {product.features.map(f => (
              <div key={f} className="flex items-center space-x-3 text-sm font-medium">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: any) => {
    e.preventDefault();
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      window.location.hash = 'dashboard';
    } catch (err: any) { alert(err.message); }
  };

  const loginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); window.location.hash = 'dashboard'; }
    catch(e) { console.error(e); }
  };

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h2 className="text-3xl font-extrabold tracking-tighter mb-2 text-center">{isLogin ? 'BEM-VINDO' : 'CRIAR CONTA'}</h2>
        <p className="text-center text-gray-500 text-sm mb-8">Acesse seus pedidos e preferências.</p>
        
        <div className="flex space-x-4 mb-8">
          <button onClick={loginGoogle} className="flex-1 flex justify-center py-3 border rounded-xl hover:bg-gray-50 transition-all">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" />
          </button>
          <button className="flex-1 flex justify-center py-3 border rounded-xl hover:bg-gray-50 transition-all">
            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-8 text-center"><hr className="border-gray-100" /><span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-bold text-gray-300 uppercase">Ou e-mail</span></div>

        <form className="space-y-4" onSubmit={handleAuth}>
          <input type="email" placeholder="E-mail" className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button className="w-full !py-4" variant="black">{isLogin ? 'ENTRAR' : 'CADASTRAR'}</Button>
        </form>

        <p className="text-center mt-6 text-sm">
          {isLogin ? 'Novo por aqui?' : 'Já tem conta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-bold underline">{isLogin ? 'Crie sua conta' : 'Faça login'}</button>
        </p>
      </div>
    </div>
  );
};

const DashboardView = ({ user }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      getDocs(q).then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 flex flex-col md:flex-row gap-10">
      <aside className="w-full md:w-64 space-y-2">
        <div className="p-6 text-center mb-6">
          <img src={user.photoURL || 'https://placehold.co/100'} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-black" />
          <h3 className="font-bold truncate">{user.displayName || user.email}</h3>
        </div>
        <button onClick={() => setTab('orders')} className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm ${tab === 'orders' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Meus Pedidos</button>
        <button onClick={() => setTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm ${tab === 'profile' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>Dados Pessoais</button>
        <button onClick={() => signOut(auth).then(() => window.location.hash = '')} className="w-full text-left px-4 py-3 rounded-lg font-bold text-sm text-red-500 hover:bg-red-50">Sair</button>
      </aside>

      <div className="flex-grow">
        {tab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold tracking-tighter">MEUS PEDIDOS</h2>
            {orders.length === 0 ? (
              <div className="p-20 bg-gray-50 rounded-2xl text-center text-gray-400">Nenhum pedido realizado.</div>
            ) : (
              orders.map(o => (
                <div key={o.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-400">PEDIDO #{o.orderNumber}</p>
                    <p className="font-extrabold text-lg">R$ {o.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{o.items.length} itens • {o.status}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${o.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {o.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {tab === 'profile' && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100">
                <h2 className="text-2xl font-extrabold tracking-tighter mb-6">DADOS PESSOAIS</h2>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400">NOME</label><p className="font-bold">{user.displayName || 'Não informado'}</p></div>
                    <div><label className="text-xs font-bold text-gray-400">E-MAIL</label><p className="font-bold">{user.email}</p></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const CheckoutView = ({ cart, user, total, onOrderPlaced }: any) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ 
    email: user?.email || '', 
    name: user?.displayName || '', 
    cpf: '', 
    cep: '', 
    street: '', 
    num: '', 
    bairro: '' 
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (step === 3) initMP();
  }, [step]);

  const initMP = () => {
    const mp = new (window as any).MercadoPago('APP_USR-786f2d55-857b-4ddf-9d4c-ff1d7a216ea4');
    const bricksBuilder = mp.bricks();
    bricksBuilder.create('payment', 'paymentBrick_container', {
      initialization: { amount: total, payer: { email: formData.email } },
      customization: { paymentMethods: { creditCard: 'all', ticket: 'all', bankTransfer: 'all' } },
      callbacks: {
        onReady: () => {},
        onSubmit: ({ formData: mpData }: any) => {
          return new Promise<void>((resolve, reject) => {
            setIsProcessing(true);
            const orderNum = Math.floor(Math.random() * 90000) + 10000;
            const orderData = {
              orderNumber: orderNum,
              userId: user?.uid || 'guest',
              customer: formData,
              total: total,
              items: cart,
              status: 'Pendente',
              createdAt: serverTimestamp()
            };
            addDoc(collection(db, "orders"), orderData)
              .then(() => {
                onOrderPlaced();
                setStep(4);
                resolve();
              })
              .catch(reject)
              .finally(() => setIsProcessing(false));
          });
        },
        onError: (err: any) => console.error(err)
      }
    });
  };

  if (cart.length === 0 && step !== 4) return <div className="p-20 text-center"><h2 className="text-2xl font-bold">Carrinho Vazio</h2><Button onClick={() => window.location.hash = ''} className="mt-4">Voltar para loja</Button></div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex justify-center space-x-12 mb-12">
          {[1,2,3].map(s => (
              <div key={s} className={`flex items-center space-x-2 ${step >= s ? 'text-blue-600' : 'text-gray-300'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${step >= s ? 'border-blue-600' : 'border-gray-300'}`}>{s}</span>
                  <span className="text-xs font-black uppercase tracking-widest hidden md:inline">{s === 1 ? 'Identificação' : s === 2 ? 'Entrega' : 'Pagamento'}</span>
              </div>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-6">
          {step === 1 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xl font-extrabold tracking-tighter">DADOS PESSOAIS</h3>
              <input type="email" placeholder="E-mail" className="w-full p-4 bg-gray-50 rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-gray-50 rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="CPF" className="w-full p-4 bg-gray-50 rounded-xl" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
              <Button onClick={() => setStep(2)} className="w-full">PRÓXIMO</Button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-xl font-extrabold tracking-tighter">ENTREGA</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="CEP" className="col-span-2 w-full p-4 bg-gray-50 rounded-xl" value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
                <input type="text" placeholder="Rua" className="col-span-2 w-full p-4 bg-gray-50 rounded-xl" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                <input type="text" placeholder="Número" className="w-full p-4 bg-gray-50 rounded-xl" value={formData.num} onChange={e => setFormData({...formData, num: e.target.value})} />
                <input type="text" placeholder="Bairro" className="w-full p-4 bg-gray-50 rounded-xl" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} />
              </div>
              <div className="flex space-x-4">
                <Button onClick={() => setStep(1)} variant="secondary" className="flex-1">VOLTAR</Button>
                <Button onClick={() => setStep(3)} className="flex-1">PAGAMENTO</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div id="paymentBrick_container"></div>
                {isProcessing && <p className="text-center font-bold text-blue-600 mt-4 animate-pulse">Processando pedido...</p>}
            </div>
          )}

          {step === 4 && (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center space-y-6">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl">✓</div>
                  <h2 className="text-3xl font-extrabold tracking-tighter">PEDIDO REALIZADO!</h2>
                  <p className="text-gray-500">Obrigado por comprar na MedFerpa. Você receberá os detalhes por e-mail.</p>
                  <Button onClick={() => window.location.hash = 'dashboard'}>VER MEUS PEDIDOS</Button>
              </div>
          )}
        </div>

        {step < 4 && (
          <aside className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-extrabold text-sm uppercase tracking-widest mb-6 border-b pb-4">Resumo</h4>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 mb-6">
                {cart.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-bold">{item.quantity}x {item.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {total.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm text-green-600 font-bold"><span>Frete</span><span>GRÁTIS</span></div>
                <div className="flex justify-between text-lg font-black mt-2"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};