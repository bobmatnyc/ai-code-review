module Api
  module V1
    class AuthenticationController < Api::V1::BaseController
      before_action :authenticate_user!, only: [:me]
      
      def login
        @user = User.find_by(email: params[:email])
        
        if @user&.valid_password?(params[:password])
          token = JsonWebToken.encode(user_id: @user.id)
          time = Time.now + 24.hours.to_i
          
          render json: { 
            token: token, 
            exp: time.strftime("%m-%d-%Y %H:%M"),
            user_id: @user.id,
            email: @user.email,
            username: @user.username 
          }, status: :ok
        else
          render json: { error: 'Invalid email or password' }, status: :unauthorized
        end
      end
      
      def me
        render json: current_user.as_json(
          only: [:id, :email, :username, :created_at, :role],
          methods: [:full_name]
        )
      end
      
      private
      
      def login_params
        params.permit(:email, :password)
      end
    end
  end
end