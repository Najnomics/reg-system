import { Link } from 'react-router-dom'

const QuickActions = ({ actions }) => {
  const colorClasses = {
    primary: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50',
    success: 'border-success-200 hover:border-success-300 hover:bg-success-50',
    warning: 'border-warning-200 hover:border-warning-300 hover:bg-warning-50',
    error: 'border-red-200 hover:border-red-300 hover:bg-red-50',
    secondary: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
  }

  const iconColorClasses = {
    primary: 'text-indigo-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-red-600',
    secondary: 'text-gray-600',
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <p className="text-sm text-gray-600">Common tasks</p>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.href}
                className={`block p-4 rounded-lg border-2 transition-all duration-200 ${
                  colorClasses[action.color] || colorClasses.primary
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon 
                      className={`h-6 w-6 ${
                        iconColorClasses[action.color] || iconColorClasses.primary
                      }`} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">
                      {action.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default QuickActions