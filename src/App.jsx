import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Calendar, CreditCard, User, FileText, Trash2, LogOut, Loader2 } from 'lucide-react'
import { authService, transactionService } from './lib/supabase'
import AuthComponent from './components/AuthComponent'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [formData, setFormData] = useState({
    nome: '',
    data: '',
    valor: '',
    anotacoes: ''
  })

  const [signature, setSignature] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canvasRef = useRef(null)

  // Verificar autenticação ao carregar
  useEffect(() => {
    checkUser()
    
    // Escutar mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadTransactions()
      } else {
        setUser(null)
        setTransactions([])
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await loadTransactions()
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getAll()
      setTransactions(data || [])
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      // Se não conseguir carregar, usar dados locais como fallback
      setTransactions([
        {
          id: 1,
          nome_pessoa: 'João Silva',
          data_transacao: '2024-06-19',
          valor: 150.00,
          anotacoes: 'Emergência médica - consulta',
          assinatura_digital: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        },
        {
          id: 2,
          nome_pessoa: 'Maria Santos',
          data_transacao: '2024-06-18',
          valor: 300.00,
          anotacoes: 'Medicamentos urgentes',
          assinatura_digital: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
      ])
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.signOut()
      setUser(null)
      setTransactions([])
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const startDrawing = (e) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2C3E50'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    setSignature(canvas.toDataURL())
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.data || !formData.valor || !signature) {
      alert('Por favor, preencha todos os campos obrigatórios e assine.')
      return
    }

    setIsSubmitting(true)

    try {
      const newTransaction = {
        nome: formData.nome,
        data: formData.data,
        valor: parseFloat(formData.valor),
        anotacoes: formData.anotacoes,
        assinatura: signature
      }

      // Tentar salvar no Supabase
      try {
        const savedTransaction = await transactionService.create(newTransaction)
        setTransactions(prev => [savedTransaction, ...prev])
      } catch (supabaseError) {
        console.error('Erro ao salvar no Supabase:', supabaseError)
        // Fallback: salvar localmente
        const localTransaction = {
          id: Date.now(),
          nome_pessoa: newTransaction.nome,
          data_transacao: newTransaction.data,
          valor: newTransaction.valor,
          anotacoes: newTransaction.anotacoes,
          assinatura_digital: newTransaction.assinatura
        }
        setTransactions(prev => [localTransaction, ...prev])
      }
      
      // Reset form
      setFormData({
        nome: '',
        data: '',
        valor: '',
        anotacoes: ''
      })
      clearSignature()
      
      alert('Transação registrada com sucesso!')
    } catch (error) {
      console.error('Erro ao registrar transação:', error)
      alert('Erro ao registrar transação. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteTransaction = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    try {
      await transactionService.delete(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      // Fallback: remover localmente
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar tela de login
  if (!user) {
    return <AuthComponent onAuthSuccess={() => setUser(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Controle de Cartão - Emergências
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm opacity-90">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-white hover:bg-blue-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Registro */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Registrar Nova Transação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Nome da Pessoa *
                      </Label>
                      <Input
                        id="nome"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        placeholder="Digite o nome completo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data *
                      </Label>
                      <Input
                        id="data"
                        name="data"
                        type="date"
                        value={formData.data}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      name="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={handleInputChange}
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assinatura">Assinatura Digital *</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="border border-gray-200 rounded bg-white cursor-crosshair w-full"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearSignature}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anotacoes">Anotações</Label>
                    <Textarea
                      id="anotacoes"
                      name="anotacoes"
                      value={formData.anotacoes}
                      onChange={handleInputChange}
                      placeholder="Observações sobre a transação..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      'Registrar Transação'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Transações */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {transaction.nome_pessoa}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(transaction.data_transacao)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">
                            {formatCurrency(transaction.valor)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {transaction.anotacoes && (
                        <p className="text-sm text-gray-600 mt-2">
                          {transaction.anotacoes}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma transação registrada ainda.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

