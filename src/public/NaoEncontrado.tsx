import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { useSeo } from './hooks'
import { BotaoLink, Container, PageHero, Vazio } from './ui'

export default function NaoEncontrado() {
  useSeo({ titulo: 'Página não encontrada' })

  return (
    <>
      <PageHero
        chapeu="Erro 404"
        titulo="Página não encontrada"
        descricao="O endereço pode ter mudado ou o conteúdo ainda não foi publicado."
      />
      <Container className="py-8">
        <Vazio
          titulo="Nada por aqui"
          texto="Volte para o início e encontre a programação, os resultados e a classificação dos jogos."
          icone={<Compass className="h-7 w-7" />}
        />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <BotaoLink to="/">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </BotaoLink>
          <BotaoLink to="/programacao" variant="outline">
            Ver programação
          </BotaoLink>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          É da organização?{' '}
          <Link to="/admin" className="font-semibold text-brand-700 hover:underline">
            Acesse o painel administrativo
          </Link>
          .
        </p>
      </Container>
    </>
  )
}
