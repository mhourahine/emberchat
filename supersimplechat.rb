# coding: utf-8
require 'sinatra'
require 'sinatra/reloader'
set server: 'thin', connections: []

get '/' do
  halt erb(:login) unless params[:user]
  erb :chat, locals: { user: params[:user].gsub(/\W/, '') }
end

get '/stream', provides: 'text/event-stream' do
  stream :keep_open do |out|
    settings.connections << out
    out.callback { settings.connections.delete(out) }
  end
end

post '/' do
  settings.connections.each { |out| out << "data: #{params[:msg]}\n\n" }
  204 # response without entity body
end

__END__

@@ layout
<html>
  <head> 
    <title>Super Simple Chat with Sinatra</title> 
    <meta charset="utf-8" />
    <script src="http://code.jquery.com/jquery.min.js"></script> 
  </head> 
  <body><%= yield %></body>
</html>

@@ login
<form action='/'>
  <label for='user'>User Name:</label>
  <input name='user' value='' />
  <input type='submit' value="GO!" />
</form>

@@ chat
<pre id='chat'></pre>

<script>
  $(function() {
    // reading
    var es = new EventSource('/stream');
    es.onmessage = function(e) { $('#chat').append(e.data + "\n") };

    // writing
    $("form").submit(function(e) {
      $.post('/', {msg: "<%= user %>: " + $('#msg').val()});
      $('#msg').val(''); $('#msg').focus();
      e.preventDefault();
      return false;
    });
  });
</script>

<form>
  <input id='msg' placeholder='type message here...' />
</form>