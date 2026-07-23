import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  CircleHelp,
  Factory,
  KeyRound,
  Layers3,
  LogIn,
  LogOut,
  PackagePlus,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'

interface WorkflowStepProps {
  number: string
  icon: ReactNode
  title: string
  description: string
}

interface ModuleGuideProps {
  id: string
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  steps: string[]
  adminActions: string
  to: string
}

interface GlossaryItemProps {
  term: string
  definition: string
}

interface GuideSectionHeadingProps {
  eyebrow: string
  title: string
  description: string
}

interface WorkflowStepComponentProps extends WorkflowStepProps {
  isLast: boolean
}

const workflowSteps: WorkflowStepProps[] = [
  {
    number: '01',
    icon: <Boxes aria-hidden="true" />,
    title: 'Prepare os produtos',
    description: 'Cadastre o produto final e os itens usados para produzi-lo.',
  },
  {
    number: '02',
    icon: <Layers3 aria-hidden="true" />,
    title: 'Monte a composição',
    description: 'Informe quais componentes e quantidades formam o produto final.',
  },
  {
    number: '03',
    icon: <PackagePlus aria-hidden="true" />,
    title: 'Registre o estoque',
    description: 'Dê entrada nos lotes dos componentes que estão disponíveis.',
  },
  {
    number: '04',
    icon: <Factory aria-hidden="true" />,
    title: 'Produza e acompanhe',
    description: 'Crie a ordem, inicie o trabalho e conclua para gerar o lote final.',
  },
]

const glossaryItems: GlossaryItemProps[] = [
  {
    term: 'SKU',
    definition: 'Código único criado automaticamente pelo sistema para identificar um produto.',
  },
  {
    term: 'ID',
    definition: 'Número interno usado pelo sistema para identificar um registro.',
  },
  {
    term: 'Composição',
    definition: 'Ficha técnica que informa os componentes e as quantidades de um produto.',
  },
  {
    term: 'Lote',
    definition: 'Grupo de unidades recebido ou produzido junto, com quantidade e datas próprias.',
  },
  {
    term: 'FEFO',
    definition: 'Regra que consome primeiro o lote com vencimento mais próximo.',
  },
  {
    term: 'Movimentação',
    definition: 'Registro de toda entrada, saída, ajuste ou consumo ocorrido no estoque.',
  },
  {
    term: 'Referência',
    definition: 'Informa qual operação de negócio deu origem a uma movimentação.',
  },
  {
    term: 'Ordem de produção',
    definition: 'Registro que acompanha o que será produzido, a quantidade e a situação atual.',
  },
  {
    term: 'Situação da ordem',
    definition: 'Indica se a ordem foi criada, está em produção, foi concluída ou cancelada.',
  },
]

export function HelpPage() {
  return (
    <>
      <PageHeader
        eyebrow="Ajuda e primeiros passos"
        title="Como usar o Haru"
        description="Um guia simples para consultar produtos, controlar o estoque e acompanhar a produção."
      />

      <section className="guide-hero" aria-labelledby="guide-welcome-title">
        <div className="guide-hero-copy">
          <span className="guide-icon guide-icon-light">
            <BookOpenCheck aria-hidden="true" />
          </span>
          <div>
            <span className="eyebrow eyebrow-light">Comece por aqui</span>
            <h2 id="guide-welcome-title">Você não precisa conhecer termos técnicos.</h2>
            <p>
              Escolha o que deseja fazer, localize o registro e siga as ações exibidas na tela. O
              Haru mantém produtos, lotes e ordens conectados para que você acompanhe todo o
              processo.
            </p>
          </div>
        </div>
        <aside className="guide-hero-note">
          <KeyRound aria-hidden="true" />
          <div>
            <strong>Os botões dependem do seu perfil</strong>
            <p>
              O perfil Consulta visualiza informações. O perfil Administrador também cadastra,
              altera e movimenta dados.
            </p>
          </div>
        </aside>
      </section>

      <nav className="guide-index" aria-label="Atalhos deste guia">
        <a href="#primeiros-passos">Primeiros passos</a>
        <a href="#perfis">Perfis de acesso</a>
        <a href="#modulos">Guia dos módulos</a>
        <a href="#glossario">Palavras importantes</a>
        <a href="#duvidas">Dúvidas comuns</a>
      </nav>

      <section id="primeiros-passos" className="guide-section" aria-labelledby="workflow-title">
        <GuideSectionHeading
          eyebrow="Fluxo recomendado"
          title="O caminho da produção, do início ao fim"
          description="Se você está preparando o sistema pela primeira vez, siga esta ordem."
        />
        <div className="guide-workflow">
          {workflowSteps.map((step, index) => (
            <WorkflowStep key={step.number} {...step} isLast={index === workflowSteps.length - 1} />
          ))}
        </div>
        <div className="guide-tip">
          <Search aria-hidden="true" />
          <div>
            <strong>Uma busca simples em todas as áreas</strong>
            <p>
              Em Produtos e Estoque, procure pelo nome, ID ou SKU. Em Produção, procure pela ordem
              ou pelo produto. Deixe a busca vazia e clique em <b>Consultar</b> para ver a lista
              completa disponível.
            </p>
          </div>
        </div>
      </section>

      <section id="perfis" className="guide-section" aria-labelledby="profiles-title">
        <GuideSectionHeading
          eyebrow="Seu acesso"
          title="O que cada perfil pode fazer"
          description="Se uma ação não aparece para você, primeiro confira qual perfil está indicado no menu lateral."
        />
        <div className="guide-access-grid">
          <article>
            <span className="guide-icon">
              <LogIn aria-hidden="true" />
            </span>
            <div>
              <h3>1. Entrar</h3>
              <p>
                Na tela inicial, clique em <b>Entrar com Keycloak</b> e informe sua conta. O mesmo
                acesso serve para perfis de Consulta e Administrador.
              </p>
            </div>
          </article>
          <article>
            <span className="guide-icon">
              <UserPlus aria-hidden="true" />
            </span>
            <div>
              <h3>2. Criar uma conta</h3>
              <p>
                Se ainda não tiver uma conta, use <b>Criar uma conta</b>. Novos cadastros recebem o
                perfil Consulta; o acesso de Administrador é concedido pelo responsável do sistema.
              </p>
            </div>
          </article>
          <article>
            <span className="guide-icon">
              <LogOut aria-hidden="true" />
            </span>
            <div>
              <h3>3. Sair com segurança</h3>
              <p>
                Ao terminar, use o botão de sair ao lado do seu nome, na parte inferior do menu
                lateral.
              </p>
            </div>
          </article>
        </div>
        <div className="guide-profile-grid">
          <article className="guide-profile-card">
            <span className="guide-icon">
              <CircleHelp aria-hidden="true" />
            </span>
            <div>
              <h3>Perfil Consulta</h3>
              <p>Ideal para quem precisa acompanhar a operação sem alterar informações.</p>
              <ul className="guide-check-list">
                <li>
                  <CheckCircle2 aria-hidden="true" /> Consultar produtos e composições
                </li>
                <li>
                  <CheckCircle2 aria-hidden="true" /> Conferir saldos, lotes e movimentações
                </li>
                <li>
                  <CheckCircle2 aria-hidden="true" /> Acompanhar ordens e rastreabilidade
                </li>
              </ul>
            </div>
          </article>
          <article className="guide-profile-card guide-profile-card-admin">
            <span className="guide-icon">
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <h3>Perfil Administrador</h3>
              <p>Além das consultas, permite executar e manter a operação.</p>
              <ul className="guide-check-list">
                <li>
                  <CheckCircle2 aria-hidden="true" /> Cadastrar produtos e composições
                </li>
                <li>
                  <CheckCircle2 aria-hidden="true" /> Registrar lotes, consumos e ajustes
                </li>
                <li>
                  <CheckCircle2 aria-hidden="true" /> Criar, iniciar, concluir ou cancelar ordens
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section id="modulos" className="guide-section" aria-labelledby="modules-title">
        <GuideSectionHeading
          eyebrow="Passo a passo"
          title="Como usar cada módulo"
          description="As consultas funcionam para todos. As ações administrativas aparecem somente para quem tem permissão."
        />
        <div className="guide-module-list">
          <ModuleGuide
            id="produtos"
            icon={<Boxes aria-hidden="true" />}
            eyebrow="1. Organize o catálogo"
            title="Produtos"
            description="Aqui ficam os itens comprados, produzidos ou usados como serviço."
            steps={[
              'Digite um nome, ID ou SKU e clique em Consultar.',
              'Selecione um resultado para abrir os dados completos.',
              'Confira o tipo, a unidade usada e a composição do produto.',
            ]}
            adminActions="Use Novo produto para cadastrar. O SKU será criado automaticamente. No produto aberto, use Componente para montar a ficha técnica."
            to="/app/products"
          />
          <ModuleGuide
            id="estoque"
            icon={<PackagePlus aria-hidden="true" />}
            eyebrow="2. Controle os lotes"
            title="Estoque"
            description="Mostra quanto existe, de quais lotes veio e tudo o que foi movimentado."
            steps={[
              'Localize o produto e selecione-o na lista.',
              'Veja o saldo disponível no destaque superior.',
              'Alterne entre Lotes e Movimentações para consultar o histórico.',
            ]}
            adminActions="Use Entrada de lote quando o material chegar. Registrar consumo baixa o estoque por FEFO. Em Ajustar, escolha entrada ou saída e sempre informe a justificativa."
            to="/app/inventory"
          />
          <ModuleGuide
            id="producao"
            icon={<Factory aria-hidden="true" />}
            eyebrow="3. Acompanhe a fabricação"
            title="Produção"
            description="Reúne as ordens, os componentes planejados e o resultado produzido."
            steps={[
              'Busque pela ordem ou pelo produto e, se quiser, filtre pela situação.',
              'Selecione a ordem para acompanhar sua linha do tempo.',
              'Depois da conclusão, confira o lote produzido e os lotes consumidos.',
            ]}
            adminActions="Crie uma Nova ordem, selecione um produto com composição e informe a quantidade. Depois, inicie a produção e conclua para consumir os componentes e gerar o lote final."
            to="/app/production"
          />
        </div>
      </section>

      <section className="guide-caution" aria-labelledby="production-check-title">
        <TriangleAlert aria-hidden="true" />
        <div>
          <h2 id="production-check-title">Antes de concluir uma produção</h2>
          <p>
            Confira a quantidade produzida, o número e as datas do novo lote. A conclusão consome
            componentes do estoque e cria o lote do produto final. Essa operação não pode ser
            desfeita pela interface.
          </p>
        </div>
      </section>

      <section id="glossario" className="guide-section" aria-labelledby="glossary-title">
        <GuideSectionHeading
          eyebrow="Sem complicação"
          title="Palavras importantes"
          description="Um resumo dos termos que aparecem durante o uso do sistema."
        />
        <dl className="guide-glossary">
          {glossaryItems.map((item) => (
            <GlossaryItem key={item.term} {...item} />
          ))}
        </dl>
      </section>

      <section id="duvidas" className="guide-section" aria-labelledby="questions-title">
        <GuideSectionHeading
          eyebrow="Ajuda rápida"
          title="Dúvidas comuns"
          description="Respostas para situações que podem aparecer no dia a dia."
        />
        <div className="guide-questions">
          <details>
            <summary>Por que não vejo o botão para cadastrar ou alterar?</summary>
            <p>
              Provavelmente seu perfil é Consulta. Veja o perfil atual na parte inferior do menu
              lateral e solicite acesso de Administrador ao responsável pelo sistema, se necessário.
            </p>
          </details>
          <details>
            <summary>Não encontrei o que procurei. O que devo fazer?</summary>
            <p>
              Tente o nome, o SKU ou o número do registro. Você também pode apagar o texto e clicar
              em Consultar para percorrer todos os resultados. Em Produção, confira se algum filtro
              de situação está selecionado.
            </p>
          </details>
          <details>
            <summary>O que significa “Backend Docker indisponível”?</summary>
            <p>
              O frontend não conseguiu se comunicar com o ambiente que guarda e processa os dados.
              Aguarde alguns instantes e, se continuar indisponível, avise o responsável técnico.
            </p>
          </details>
          <details>
            <summary>Por que não consigo criar ou concluir uma ordem?</summary>
            <p>
              O produto final precisa estar ativo e ter uma composição cadastrada. Para concluir,
              também deve existir estoque disponível dos componentes. Leia a mensagem apresentada na
              tela para identificar o item que precisa ser corrigido.
            </p>
          </details>
          <details>
            <summary>Como identifico uma operação depois que ela aconteceu?</summary>
            <p>
              Consulte Movimentações no Estoque para entradas e saídas. Para uma fabricação,
              consulte a ordem em Produção e veja o lote gerado e os lotes de componentes
              consumidos.
            </p>
          </details>
        </div>
      </section>

      <section className="guide-footer-card">
        <div>
          <span className="eyebrow">Pronto para começar?</span>
          <h2>Escolha uma área do sistema</h2>
          <p>Você pode voltar a este guia a qualquer momento pelo menu Como usar.</p>
        </div>
        <div className="guide-footer-actions">
          <Link className="button button-secondary" to="/app/products">
            Produtos
          </Link>
          <Link className="button button-secondary" to="/app/inventory">
            Estoque
          </Link>
          <Link className="button button-primary" to="/app/production">
            Produção <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}

function GuideSectionHeading({ eyebrow, title, description }: GuideSectionHeadingProps) {
  return (
    <header className="guide-section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  )
}

function WorkflowStep({ number, icon, title, description, isLast }: WorkflowStepComponentProps) {
  return (
    <article className="guide-workflow-step">
      <div className="guide-workflow-top">
        <span className="guide-step-number">{number}</span>
        <span className="guide-icon">{icon}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {!isLast && <ArrowRight className="guide-workflow-arrow" aria-hidden="true" />}
    </article>
  )
}

function ModuleGuide({
  id,
  icon,
  eyebrow,
  title,
  description,
  steps,
  adminActions,
  to,
}: ModuleGuideProps) {
  return (
    <article id={id} className="guide-module-card">
      <div className="guide-module-heading">
        <span className="guide-icon">{icon}</span>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="guide-module-body">
        <div>
          <h4>Para consultar</h4>
          <ol>
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <aside>
          <strong>
            <ShieldCheck size={17} aria-hidden="true" /> Para administradores
          </strong>
          <p>{adminActions}</p>
        </aside>
      </div>
      <Link className="guide-module-link" to={to}>
        Ir para {title} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

function GlossaryItem({ term, definition }: GlossaryItemProps) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{definition}</dd>
    </div>
  )
}
