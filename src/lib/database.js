import { supabase, isSupabaseConfigured } from './supabase';

// ===== Local Storage Fallback =====
const LOCAL_STORE_KEY = 'nihon_ready_data';

function getLocalStore() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORE_KEY) || '{}');
  } catch { return {}; }
}

function setLocalStore(data) {
  localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(data));
}

function getLocalArray(key) {
  const store = getLocalStore();
  return store[key] || [];
}

function setLocalArray(key, arr) {
  const store = getLocalStore();
  store[key] = arr;
  setLocalStore(store);
}

// ===== User operations =====
export async function getUser(telegramId) {
  if (!isSupabaseConfigured()) {
    const users = getLocalArray('users');
    return users.find(u => u.telegram_id === telegramId) || null;
  }
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createUser(userData) {
  const newUser = {
    id: crypto.randomUUID(),
    telegram_id: userData.id,
    first_name: userData.firstName,
    last_name: userData.lastName,
    username: userData.username,
    photo_url: userData.photoUrl,
    is_paid: false,
    onboarding_count: 0,
    created_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured()) {
    const users = getLocalArray('users');
    users.push(newUser);
    setLocalArray('users', users);
    return newUser;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([newUser])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(telegramId, updates) {
  if (!isSupabaseConfigured()) {
    const users = getLocalArray('users');
    const idx = users.findIndex(u => u.telegram_id === telegramId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updates, updated_at: new Date().toISOString() };
      setLocalArray('users', users);
      return users[idx];
    }
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== Onboarding responses =====
export async function saveOnboardingData(telegramId, responses) {
  if (!isSupabaseConfigured()) {
    const onboarding = getLocalArray('onboarding_responses');
    const existing = onboarding.find(o => o.telegram_id === telegramId);
    if (existing) {
      existing.responses = responses;
      existing.updated_at = new Date().toISOString();
    } else {
      onboarding.push({
        id: crypto.randomUUID(),
        telegram_id: telegramId,
        responses,
        created_at: new Date().toISOString()
      });
    }
    setLocalArray('onboarding_responses', onboarding);
    return onboarding.find(o => o.telegram_id === telegramId);
  }

  const { data: existing } = await supabase
    .from('onboarding_responses')
    .select('id')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .update({ responses, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .insert([{
        telegram_id: telegramId,
        responses,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getOnboardingData(telegramId) {
  if (!isSupabaseConfigured()) {
    const onboarding = getLocalArray('onboarding_responses');
    return onboarding.find(o => o.telegram_id === telegramId) || null;
  }

  const { data, error } = await supabase
    .from('onboarding_responses')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ===== Generated content operations =====
export async function saveGeneratedContent(telegramId, contentType, content) {
  if (!isSupabaseConfigured()) {
    const generated = getLocalArray('generated_content');
    const existingIdx = generated.findIndex(
      g => g.telegram_id === telegramId && g.content_type === contentType
    );
    const record = {
      id: existingIdx >= 0 ? generated[existingIdx].id : crypto.randomUUID(),
      telegram_id: telegramId,
      content_type: contentType,
      content,
      created_at: existingIdx >= 0 ? generated[existingIdx].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      generated[existingIdx] = record;
    } else {
      generated.push(record);
    }
    setLocalArray('generated_content', generated);
    return record;
  }

  const { data: existing } = await supabase
    .from('generated_content')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('generated_content')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('generated_content')
      .insert([{
        telegram_id: telegramId,
        content_type: contentType,
        content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getGeneratedContent(telegramId, contentType) {
  if (!isSupabaseConfigured()) {
    const generated = getLocalArray('generated_content');
    return generated.find(
      g => g.telegram_id === telegramId && g.content_type === contentType
    ) || null;
  }

  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('content_type', contentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAllGeneratedContent(telegramId) {
  if (!isSupabaseConfigured()) {
    const generated = getLocalArray('generated_content');
    return generated.filter(g => g.telegram_id === telegramId);
  }

  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ===== Payment operations =====
export async function createPayment(telegramId, amount, paymentType) {
  const record = {
    id: crypto.randomUUID(),
    telegram_id: telegramId,
    amount,
    payment_type: paymentType,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (!isSupabaseConfigured()) {
    const payments = getLocalArray('payments');
    payments.push(record);
    setLocalArray('payments', payments);
    return record;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([record])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPayment(telegramId, paymentType) {
  if (!isSupabaseConfigured()) {
    const payments = getLocalArray('payments');
    return payments
      .filter(p => p.telegram_id === telegramId && p.payment_type === paymentType)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('telegram_id', telegramId)
    .eq('payment_type', paymentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updatePaymentStatus(paymentId, status) {
  if (!isSupabaseConfigured()) {
    const payments = getLocalArray('payments');
    const idx = payments.findIndex(p => p.id === paymentId);
    if (idx >= 0) {
      payments[idx].status = status;
      payments[idx].updated_at = new Date().toISOString();
      setLocalArray('payments', payments);
      return payments[idx];
    }
    return null;
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ===== Admin operations =====
export async function getAllUsers() {
  if (!isSupabaseConfigured()) {
    return getLocalArray('users').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllPayments() {
  if (!isSupabaseConfigured()) {
    return getLocalArray('payments').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAnalytics() {
  let users, payments, content;

  if (!isSupabaseConfigured()) {
    users = getLocalArray('users');
    payments = getLocalArray('payments');
    content = getLocalArray('generated_content');
  } else {
    const res1 = await supabase.from('users').select('*');
    const res2 = await supabase.from('payments').select('*');
    const res3 = await supabase.from('generated_content').select('telegram_id, content_type');
    users = res1.data || [];
    payments = res2.data || [];
    content = res3.data || [];
  }

  const totalUsers = users.length;
  const paidUsers = users.filter(u => u.is_paid).length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const totalRevenue = payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount || 0), 0);
  const contentGenerated = content.length;

  const now = new Date();
  const dailyRegs = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = users.filter(u => u.created_at?.startsWith(dateStr)).length;
    dailyRegs.push({ date: dateStr, count });
  }

  return {
    totalUsers,
    paidUsers,
    pendingPayments,
    totalRevenue,
    contentGenerated,
    dailyRegs,
    conversionRate: totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : 0
  };
}
