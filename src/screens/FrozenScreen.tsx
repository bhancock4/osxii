import { useGame } from '../state/game'

export default function FrozenScreen() {
  const { balance, subscriptions } = useGame()
  const monthly = subscriptions.reduce((s, sub) => s + sub.price, 0)

  return (
    <div className="fullscreen frozen-screen">
      <div className="frozen-body">
        <h1>:(</h1>
        <h2>OSXII FINANCIAL SERVICES</h2>
        <p>Your personal bank account has been frozen due to an unusual level of enthusiasm for subscriptions.</p>
        <p>Final balance: ${balance.toFixed(2)}</p>
        <div className="frozen-subs">
          <p>Itemized statement:</p>
          {subscriptions.map((s, i) => (
            <div key={i} className="frozen-line">
              <span>{s.name}</span>
              <span>${s.price.toFixed(2)}/mo</span>
            </div>
          ))}
          <div className="frozen-line frozen-total">
            <span>Total monthly commitment</span>
            <span>${monthly.toFixed(2)}</span>
          </div>
        </div>
        <p>A support agent will be with you shortly. Estimated wait: 7 years.</p>
        <p className="frozen-hold">♫ hold music (described): smooth jazz, but it's buffering ♫</p>
        <button className="frozen-btn" onClick={() => window.location.reload()}>
          Declare bankruptcy and try again
        </button>
      </div>
    </div>
  )
}
