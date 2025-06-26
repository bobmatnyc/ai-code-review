Rails.application.routes.draw do
  devise_for :users
  
  root "posts#index"
  
  resources :posts do
    resources :comments, only: [:create, :destroy]
    member do
      post :like
      delete :unlike
    end
  end
  
  namespace :admin do
    resources :users
    resources :posts
    resources :categories
    
    get 'dashboard', to: 'dashboard#index'
  end
  
  get 'profile', to: 'users#show'
  patch 'profile', to: 'users#update'
  
  # API routes
  namespace :api do
    namespace :v1 do
      resources :posts, only: [:index, :show, :create, :update, :destroy]
      resources :users, only: [:show]
      
      post 'auth/login', to: 'authentication#login'
      get 'auth/me', to: 'authentication#me'
    end
  end
end