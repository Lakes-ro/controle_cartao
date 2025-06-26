import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
// Estas variáveis serão configuradas no ambiente de produção
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Função para criar as tabelas necessárias
export const createTables = async () => {
  try {
    // Criar tabela de usuários (se não existir)
    const { error: usersError } = await supabase.rpc('create_users_table', {})
    
    // Criar tabela de transações
    const { error: transactionsError } = await supabase.rpc('create_transactions_table', {})
    
    if (usersError) console.log('Tabela de usuários já existe ou erro:', usersError)
    if (transactionsError) console.log('Tabela de transações já existe ou erro:', transactionsError)
  } catch (error) {
    console.log('Erro ao criar tabelas:', error)
  }
}

// Funções para gerenciar transações
export const transactionService = {
  // Buscar todas as transações
  async getAll() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Criar nova transação
  async create(transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        nome_pessoa: transaction.nome,
        data_transacao: transaction.data,
        valor: transaction.valor,
        anotacoes: transaction.anotacoes,
        assinatura_digital: transaction.assinatura,
        created_at: new Date().toISOString()
      }])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Atualizar transação
  async update(id, transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        nome_pessoa: transaction.nome,
        data_transacao: transaction.data,
        valor: transaction.valor,
        anotacoes: transaction.anotacoes,
        assinatura_digital: transaction.assinatura,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Deletar transação
  async delete(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Funções para autenticação
export const authService = {
  // Login
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Registro
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Obter usuário atual
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Escutar mudanças de autenticação
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

