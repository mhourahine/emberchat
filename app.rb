require 'sinatra'
require 'sinatra/reloader'
require 'sass'
require 'json'

enable :sessions
set server: 'thin', connections: []

#quick user
User = Struct.new(:username) do
	def to_json
		{ username: self.username }.to_json
	end
end

get '/' do
	File.read 'public/index.html'
end

get '/stylesheets/*.css' do
  content_type 'text/css', :charset => 'utf-8'
  filename = params[:splat].first
  scss filename.to_sym, :views => "#{settings.root}/assets/stylesheets"
end

get '/javascripts/*.js' do
	content_type 'text/javascript', :charset => 'utf-8'
	filename = params[:splat].first
	File.read "#{settings.root}/assets/javascripts/#{filename}.js"
end

get '/messages' do
	content_type 'application/json'
	{
		messages: [
			{ username: 'anon', content: 'Welcome to Simple Chat!', createdAt: Time.now },
			{ username: 'anon', content: "Let's get chatting...", createdAt: Time.now }
		]
	}.to_json
end

post '/messages' do
	request.body.rewind  # in case someone already read it
  	data = JSON.parse request.body.read
  	
  	#add current user to message data	
  	data['message']['username'] = session[:current_user][:username]

  	#TODO - store message somehwere

  	#send message out to all clients
  	settings.connections.each { |out| out << "data: #{data.to_json}\n\n" }
	204
end

get '/message_stream', provides: 'text/event-stream' do
  stream :keep_open do |out|
    settings.connections << out
    out.callback { settings.connections.delete(out) }
  end
end

get '/current_user' do
	session[:current_user].to_json
end

post '/login' do
	session[:current_user] = User.new(params[:username])
	session[:current_user].to_json
end

post '/logout' do
	session[:current_user] = nil
	204
end

