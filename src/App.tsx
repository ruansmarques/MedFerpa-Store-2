import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, googleProvider, storage } from './firebase';
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
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { Trash2, Plus, Upload, X, Edit, Package, LogOut, ShoppingBag, LayoutDashboard, Menu, Lock, Save, Loader2 } from 'lucide-react';

// --- Types ---
type ProductColor = {
  name: string;
  hex: string;
  images: string[];
};

type Product = {
  id?: string; // Firestore ID
  slug: string;
  name: string;
  price: number;
  model: string;
  badges: string[];
  description: string;
  features: string[];
  colors: ProductColor[];
  sizes: string[];
  createdAt?: any;
};

type CartItem = Product & {
  selectedSize: string;
  selectedColor: string;
  selectedImg: string;
  quantity: number;
};

// --- Global Components ---
const Logo = () => (
  <span className="font-extrabold text-2xl tracking-tighter cursor-pointer flex items-center gap-1" onClick={() => window.location.hash = ''}>
    MEDFERPA<span className="text-blue-600">.</span>
  </span>
);

const Button = ({ children, onClick, className = "", variant = "primary", disabled = false, type="button" }: any) => {
  const base = "px-6 py-3 font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-white text-black border border-black hover:bg-gray-50",
    blue: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

// --- App Root ---
export const App = () => {
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || 'home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    const savedCart = localStorage.getItem('medferpa_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
    
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('product/')) {
        setSelectedProductId(hash.split('/')[1]);
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
      const exists = prev.find(i => i.id === item.id && i.selectedSize === item.selectedSize && i.selectedColor === item.selectedColor);
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
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      {route !== 'admin' && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <Logo />
            <nav className="hidden md:flex space-x-8 font-bold text-xs uppercase tracking-widest">
              <a href="#" className="hover:text-blue-600 transition-colors">Novidades</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Masculino</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Feminino</a>
            </nav>
            <div className="flex items-center space-x-5">
              <button onClick={() => setIsCartOpen(true)} className="relative hover:text-blue-600 transition-colors">
                <ShoppingBag className="w-6 h-6" />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold animate-bounce">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
              </button>
              
              {user ? (
                 <div className="flex items-center gap-3">
                   {/* Botão Admin no Header para facilitar acesso */}
                   <button 
                     onClick={() => window.location.hash = 'admin'}
                     className="hidden md:flex items-center gap-1 text-[10px] font-bold bg-gray-900 text-white px-3 py-1.5 rounded uppercase tracking-wider hover:bg-blue-600 transition-colors"
                   >
                     <Lock className="w-3 h-3" /> Admin
                   </button>
                   
                   <button onClick={() => window.location.hash = 'dashboard'}>
                     <img src={user.photoURL || 'https://placehold.co/100'} className="w-8 h-8 rounded-full border-2 border-black" />
                   </button>
                 </div>
              ) : (
                <button onClick={() => window.location.hash = 'login'} className="font-bold text-sm hover:text-blue-600">
                  ENTRAR
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow">
        {route === 'home' && <HomeView />}
        {route === 'product' && <ProductDetailView productId={selectedProductId} onAddToCart={addToCart} />}
        {route === 'login' && <LoginView />}
        {route === 'dashboard' && <DashboardView user={user} />}
        {route === 'checkout' && <CheckoutView cart={cart} user={user} total={cartTotal} onOrderPlaced={() => setCart([])} />}
        {route === 'admin' && <AdminView user={user} />}
      </main>

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-extrabold text-xl flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> SEU CARRINHO</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-2xl hover:text-red-500 transition-colors">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                  <ShoppingBag className="w-16 h-16 opacity-20" />
                  <p>Seu carrinho está vazio.</p>
                  <Button onClick={() => setIsCartOpen(false)} variant="secondary" className="mt-4">Navegar na Loja</Button>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex space-x-4 border-b border-gray-100 pb-4 last:border-0">
                    <img src={item.selectedImg} className="w-20 h-24 object-cover rounded bg-gray-100" />
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm max-w-[140px] leading-tight">{item.name}</h4>
                        <button onClick={() => removeFromCart(idx)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <p className="text-xs text-gray-500 uppercase mt-1">{item.selectedColor} | {item.selectedSize}</p>
                      <div className="flex justify-between items-end mt-2">
                        <div className="flex items-center border rounded-md bg-gray-50">
                          <button onClick={() => updateQty(idx, -1)} className="px-2 py-1 hover:bg-gray-200 rounded-l-md">-</button>
                          <span className="px-2 text-sm font-bold min-w-[1.5rem] text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(idx, 1)} className="px-2 py-1 hover:bg-gray-200 rounded-r-md">+</button>
                        </div>
                        <p className="font-bold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 border-t bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between font-extrabold text-lg mb-4">
                  <span>SUBTOTAL</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <Button 
                  onClick={() => { setIsCartOpen(false); window.location.hash = 'checkout'; }} 
                  className="w-full shadow-lg shadow-blue-500/20"
                >
                  FINALIZAR COMPRA
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      {route !== 'admin' && (
        <footer className="bg-black text-white py-16 mt-auto">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div><Logo /><p className="mt-4 text-gray-400 text-sm">Peças essenciais para uma vida em movimento.</p></div>
            <div><h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500">Ajuda</h4><div className="flex flex-col space-y-2 text-sm text-gray-300"><a href="#" className="hover:text-white">Trocas e Devoluções</a><a href="#" className="hover:text-white">FAQ</a><a href="#" className="hover:text-white">Fale Conosco</a></div></div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500">Institucional</h4>
              <div className="flex flex-col space-y-2 text-sm text-gray-300"><a href="#" className="hover:text-white">Nossa Tecnologia</a><a href="#" className="hover:text-white">Manifesto</a></div>
              
              {/* Botão Admin no Footer - Super Visível Agora */}
              <div className="mt-8 pt-4 border-t border-gray-800">
                 <button 
                   onClick={() => window.location.hash = 'admin'}
                   className="flex items-center gap-2 text-gray-400 hover:text-white text-xs uppercase font-bold tracking-widest transition-colors"
                 >
                   <Lock className="w-4 h-4" /> Área Administrativa
                 </button>
              </div>

            </div>
            <div>
              <h4 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500">Newsletter</h4>
              <div className="flex"><input type="email" placeholder="Seu e-mail" className="bg-gray-900 border-none px-4 py-2 w-full text-sm rounded-l-lg focus:ring-1 focus:ring-blue-600 outline-none" /><button className="bg-white text-black font-bold px-4 rounded-r-lg text-xs hover:bg-gray-200">OK</button></div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

// --- Admin View (CRUD) ---

const AdminView = ({ user }: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  // Form States
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('Camiseta');
  const [badges, setBadges] = useState(''); // Comma separated
  const [features, setFeatures] = useState(''); // Comma separated
  const [sizes, setSizes] = useState('P,M,G,GG'); // Comma separated
  
  // Color Variant State
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    // Realtime products fetch
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setName(''); setPrice(''); setDescription(''); setModel('Camiseta');
    setBadges(''); setFeatures(''); setSizes('P,M,G,GG');
    setColors([]); setEditingId(null);
    setActiveTab('list');
  };

  const handleEdit = (p: Product) => {
    setName(p.name);
    setPrice(p.price.toString());
    setDescription(p.description);
    setModel(p.model);
    setBadges(p.badges.join(', '));
    setFeatures(p.features.join(', '));
    setSizes(p.sizes.join(', '));
    setColors(p.colors);
    setEditingId(p.id!);
    setActiveTab('form');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja deletar este produto? Essa ação não pode ser desfeita.')) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImg(true);
    try {
      // Create a reference to 'products/TIMESTAMP_FILENAME'
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      // Add color variant with this image
      if (!newColorName) { 
          alert('Por favor, digite o nome da cor (ex: Preto) antes de enviar a foto.'); 
          setUploadingImg(false);
          return; 
      }
      
      setColors(prev => [...prev, {
        name: newColorName,
        hex: newColorHex,
        images: [url] // In MVP, 1 image per color variant
      }]);
      setNewColorName(''); // Reset for next add
      
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar imagem. Verifique se você está logado e tem permissão.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!name || !price || colors.length === 0) {
      alert('Preencha os campos obrigatórios e adicione pelo menos uma cor/imagem.');
      return;
    }

    setLoading(true);
    const productData: any = {
      name,
      slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      price: parseFloat(price),
      description,
      model,
      badges: badges.split(',').map(s => s.trim()).filter(Boolean),
      features: features.split(',').map(s => s.trim()).filter(Boolean),
      sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "products", editingId), productData);
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, "products"), productData);
      }
      resetForm();
      alert('Produto salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
              <Lock className="w-12 h-12 mx-auto text-red-500 mb-4" />
              <h1 className="text-2xl font-black mb-2">Área Restrita</h1>
              <p className="text-gray-500 mb-6">Você precisa estar logado para acessar o painel administrativo.</p>
              <Button onClick={() => window.location.hash = 'login'} className="w-full">Ir para Login</Button>
              <button onClick={() => window.location.hash = ''} className="mt-4 text-sm text-gray-400 hover:text-black">Voltar para Loja</button>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      
      {/* Mobile Admin Header */}
      <div className="md:hidden bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <span className="font-bold tracking-tighter flex items-center gap-2"><Lock className="w-4 h-4 text-blue-500"/> ADMIN</span>
        <div className="flex gap-4">
           <button onClick={() => setActiveTab('list')} className={activeTab === 'list' ? 'text-blue-400' : 'text-white'}><Package size={24}/></button>
           <button onClick={() => { resetForm(); setActiveTab('form'); }} className={activeTab === 'form' ? 'text-blue-400' : 'text-white'}><Plus size={24}/></button>
           <button onClick={() => window.location.hash = ''}><LogOut size={24}/></button>
        </div>
      </div>

      {/* Desktop Admin Sidebar */}
      <aside className="w-64 bg-black text-white p-6 flex flex-col hidden md:flex sticky top-0 h-screen">
        <h2 className="text-2xl font-black tracking-tighter mb-10">MEDFERPA<span className="text-blue-500">.</span><br/><span className="text-xs font-normal text-gray-400 tracking-normal">ADMINISTRATIVO</span></h2>
        <nav className="flex-grow space-y-2">
          <button onClick={() => setActiveTab('list')} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
            <Package className="w-5 h-5" /> Produtos
          </button>
          <button onClick={() => { resetForm(); setActiveTab('form'); }} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'form' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
            <Plus className="w-5 h-5" /> Novo Produto
          </button>
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
                <img src={user.photoURL} className="w-8 h-8 rounded-full border border-gray-600"/>
                <div className="text-xs">
                    <p className="font-bold text-white truncate w-32">{user.displayName}</p>
                    <p className="text-gray-500">Admin</p>
                </div>
            </div>
            <button onClick={() => window.location.hash = ''} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <LogOut className="w-4 h-4" /> Voltar para Loja
            </button>
        </div>
      </aside>

      {/* Admin Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        {activeTab === 'list' && (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gerenciar Produtos</h1>
                  <p className="text-gray-500">Gerencie o catálogo da sua loja em tempo real.</p>
              </div>
              <Button onClick={() => { resetForm(); setActiveTab('form'); }} variant="blue" className="hidden md:flex shadow-lg shadow-blue-500/30"><Plus className="w-4 h-4" /> Adicionar Novo</Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Produto</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Preço</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Variantes</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                            <img src={p.colors[0]?.images[0]} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="font-bold block text-gray-900">{p.name}</span>
                          <span className="text-xs text-gray-500 md:hidden">R$ {p.price.toFixed(2)}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wide text-gray-400 bg-gray-100 px-1 rounded">{p.model}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono font-medium text-gray-700">R$ {p.price.toFixed(2)}</td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="flex gap-1">
                          {p.colors.map((c, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border border-gray-200 shadow-sm tooltip" style={{ background: c.hex }} title={c.name} />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                      <tr>
                          <td colSpan={4} className="p-20 text-center">
                              <div className="flex flex-col items-center text-gray-400">
                                  <Package className="w-12 h-12 mb-2 opacity-20" />
                                  <p className="font-medium">Nenhum produto cadastrado.</p>
                                  <p className="text-sm">Clique em "Adicionar Novo" para começar.</p>
                              </div>
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'form' && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h1>
                <button onClick={() => setActiveTab('list')} className="text-sm text-gray-500 hover:text-black underline">Cancelar</button>
            </div>
            
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Basic Info */}
              <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Informações Básicas</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nome do Produto</label><input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Tech T-Shirt" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Preço (R$)</label><input type="number" step="0.01" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00" /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Descrição</label><textarea rows={4} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Descreva os detalhes e benefícios do produto..." /></div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Detalhes & Categorias</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Modelo</label><input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: Camiseta" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tamanhos (separar por vírgula)</label><input className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="P, M, G, GG" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Badges (Tags)</label><input placeholder="Ex: NOVO, OFERTA" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" value={badges} onChange={e => setBadges(e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Features (Características)</label><input placeholder="Ex: Antiodor, Leve" className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200" value={features} onChange={e => setFeatures(e.target.value)} /></div>
                    </div>
                  </div>
              </div>

              {/* Right Column: Images/Colors & Save */}
              <div className="space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Imagens & Cores</h3>
                    <p className="text-xs text-gray-500 mb-4">Adicione cada variante de cor e sua respectiva foto.</p>
                    
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nome da Cor</label>
                            <input placeholder="Ex: Azul" className="w-full p-2 bg-white rounded border border-gray-300 mb-2" value={newColorName} onChange={e => setNewColorName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Cor (Hex)</label>
                            <div className="flex items-center gap-2">
                                <input type="color" className="h-8 w-12 cursor-pointer p-0 border-0 rounded" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} />
                                <span className="text-xs font-mono">{newColorHex}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Foto do Produto</label>
                            <label className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingImg ? 'bg-gray-100 border-gray-300' : 'bg-white border-blue-300 hover:bg-blue-50'}`}>
                                {uploadingImg ? <Loader2 className="w-6 h-6 animate-spin text-blue-500" /> : <Upload className="w-6 h-6 text-blue-500" />}
                                <span className="text-xs mt-2 text-gray-500">{uploadingImg ? 'Enviando...' : 'Clique para enviar foto'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg || !newColorName} />
                            </label>
                            {!newColorName && <p className="text-[10px] text-red-500 mt-1">* Digite o nome da cor primeiro.</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {colors.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-100 group">
                                <img src={c.images[0]} className="w-10 h-10 object-cover rounded bg-white" />
                                <div className="flex-grow">
                                    <p className="text-xs font-bold">{c.name}</p>
                                    <div className="w-3 h-3 rounded-full border border-gray-300" style={{background: c.hex}}></div>
                                </div>
                                <button type="button" onClick={() => setColors(colors.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                 </div>

                 <Button type="submit" variant="primary" disabled={loading} className="w-full shadow-xl shadow-blue-900/10 py-4">
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Salvando...</span> : <span className="flex items-center gap-2"><Save className="w-4 h-4"/> Salvar Produto</span>}
                 </Button>
              </div>

            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Consumer Views (Updated for Firestore) ---

const HomeView = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <section className="relative h-[70vh] bg-gray-900 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=1920" className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4 animate-in fade-in duration-1000">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6">TECHWEAR<br/>REINVENTADO</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl font-light">Funcionalidade avançada e estética futurista para o dia a dia.</p>
          <Button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })} variant="secondary" className="!bg-white !text-black border-none px-8 py-4 text-lg">VER COLEÇÃO</Button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex justify-between items-end mb-12 border-b pb-4">
          <div><h2 className="text-3xl font-extrabold tracking-tighter">ESSENCIAIS</h2><p className="text-gray-500">Tecnologia que eleva o dia a dia.</p></div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {products.map(p => (
              <div key={p.id} className="group cursor-pointer" onClick={() => window.location.hash = `product/${p.id}`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg mb-4">
                  <img src={p.colors[0]?.images[0] || 'https://placehold.co/600x800'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {p.badges.map(b => <span key={b} className="bg-white text-[10px] font-black px-2 py-1 rounded shadow-sm tracking-wider">{b}</span>)}
                  </div>
                  {/* Quick add preview */}
                  <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                     <button className="w-full bg-white text-black font-bold py-3 rounded shadow-lg text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors">Ver Detalhes</button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg leading-tight">{p.name}</h3>
                    <p className="text-gray-900 font-extrabold">R$ {p.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{p.model}</p>
                  <div className="flex gap-1 mt-2">
                    {p.colors.map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-full border border-gray-300" style={{background: c.hex}} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
                <div className="col-span-3 text-center py-20">
                    <p className="text-gray-400 mb-4">Nenhum produto cadastrado no momento.</p>
                    <button onClick={() => window.location.hash = 'admin'} className="text-blue-600 font-bold underline">Cadastrar produtos no Admin</button>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductDetailView = ({ productId, onAddToCart }: any) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [mainImg, setMainImg] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const docRef = doc(db, "products", productId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product;
          setProduct(p);
          if (p.colors.length > 0) {
            setSelectedColor(p.colors[0]);
            setMainImg(p.colors[0].images[0]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0,0);
  }, [productId]);

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;
  if (!product) return <div className="p-20 text-center">Produto não encontrado</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-4">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
            <img src={mainImg} className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.badges.map(b => <span key={b} className="bg-black text-white text-[10px] font-black px-3 py-1 rounded shadow-sm tracking-wider">{b}</span>)}
            </div>
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {selectedColor?.images.map((img, i) => (
              <img key={i} src={img} onClick={() => setMainImg(img)} className={`w-24 h-32 object-cover cursor-pointer rounded-lg border-2 transition-all ${mainImg === img ? 'border-black opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-8 py-8">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><div className="w-4 h-[1px] bg-gray-400"></div> {product.model}</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">{product.name}</h1>
            <p className="text-3xl font-bold mt-4 text-blue-600">R$ {product.price.toFixed(2)}</p>
            <p className="mt-6 text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Cor Selecionada: <span className="text-black">{selectedColor?.name}</span></p>
            <div className="flex space-x-3">
              {product.colors.map(c => (
                <button 
                  key={c.name} 
                  onClick={() => { setSelectedColor(c); setMainImg(c.images[0]); }}
                  className={`w-12 h-12 rounded-full border-2 p-1 transition-all ${selectedColor?.name === c.name ? 'border-black scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  <div className="w-full h-full rounded-full shadow-inner" style={{ background: c.hex }} title={c.name} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center"><p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tamanho</p> <button className="text-xs underline font-bold text-gray-400 hover:text-black">Guia de medidas</button></div>
            <div className="grid grid-cols-4 gap-3">
              {product.sizes.map(s => (
                <button 
                  key={s} 
                  onClick={() => setSelectedSize(s)}
                  className={`py-3 text-sm font-bold border rounded-lg transition-all ${selectedSize === s ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-900'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <Button 
              className="w-full !py-4 text-lg shadow-xl shadow-blue-900/10" 
              onClick={() => onAddToCart({ ...product, selectedSize: selectedSize, selectedColor: selectedColor?.name, selectedImg: mainImg, quantity: 1 })}
              disabled={!selectedSize}
            >
              {selectedSize ? 'ADICIONAR AO CARRINHO' : 'SELECIONE UM TAMANHO'}
            </Button>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl space-y-3 border border-gray-100">
            <h4 className="font-bold text-sm uppercase mb-2">Destaques</h4>
            {product.features.map(f => (
              <div key={f} className="flex items-center space-x-3 text-sm font-medium text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
        </div>

        <div className="relative mb-8 text-center"><hr className="border-gray-100" /><span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-bold text-gray-300 uppercase">Ou e-mail</span></div>

        <form className="space-y-4" onSubmit={handleAuth}>
          <input type="email" placeholder="E-mail" className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button className="w-full !py-4" variant="primary" type="submit">{isLogin ? 'ENTRAR' : 'CADASTRAR'}</Button>
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
    if (!(window as any).MercadoPago) return;
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
